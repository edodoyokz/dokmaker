import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { creditWallet, debitWallet } from "@/modules/wallet/service";
import {
  AI_INVOICE_ALLOWED_MIME_TYPES,
  AI_INVOICE_FREE_ANALYSES_PER_DAY,
  AI_INVOICE_MAX_IMAGE_BYTES,
  getAiInvoiceGenerationPrice,
} from "./constants";
import { analyzeReferenceImage, generateInvoiceImage } from "./pollinations";
import {
  aiImageStorage,
  buildAiOutputImageStorageKey,
  buildAiReferenceImageStorageKey,
} from "./storage";

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function assertInstruction(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length < 3) throw new Error("Instruksi perubahan wajib diisi");
  if (trimmed.length > 2000) throw new Error("Instruksi perubahan terlalu panjang");
  return trimmed;
}

function buildPrompt(input: { analysisSummary: string; instruction: string }): string {
  return [
    "Create a clean invoice document image based on this reference analysis.",
    "Keep the layout close to the reference, apply the user's requested changes, and produce a professional invoice-like image.",
    `Reference analysis: ${input.analysisSummary}`,
    `User changes: ${input.instruction}`,
    "Do not add watermark. Use sharp readable text. Mobile preview friendly portrait document.",
  ].join("\n");
}

export async function createAiInvoiceSession(userId: string, file: File) {
  if (!AI_INVOICE_ALLOWED_MIME_TYPES.includes(file.type as (typeof AI_INVOICE_ALLOWED_MIME_TYPES)[number])) {
    throw new Error("File harus berupa gambar JPG, PNG, atau WebP");
  }
  if (file.size > AI_INVOICE_MAX_IMAGE_BYTES) throw new Error("Ukuran gambar maksimal 5MB");

  const sessionId = crypto.randomUUID();
  const body = Buffer.from(await file.arrayBuffer());
  const storageKey = buildAiReferenceImageStorageKey({
    userId,
    sessionId,
    extension: extensionForMime(file.type),
  });
  await aiImageStorage.put(storageKey, body, file.type);

  return prisma.aiGenerationSession.create({
    data: {
      id: sessionId,
      userId,
      referenceImageStorageKey: storageKey,
      referenceImageMimeType: file.type,
      referenceImageSizeBytes: file.size,
      status: "uploaded",
    },
    include: { outputs: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getAiInvoiceSession(userId: string, sessionId: string) {
  const session = await prisma.aiGenerationSession.findFirst({
    where: { id: sessionId, userId },
    include: { outputs: { orderBy: { createdAt: "desc" } } },
  });
  if (!session) throw new Error("Sesi AI tidak ditemukan");
  return session;
}

export async function analyzeAiInvoiceSession(userId: string, sessionId: string) {
  const session = await prisma.aiGenerationSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Sesi AI tidak ditemukan");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiGenerationSession.count({
    where: { userId, analysisSummary: { not: null }, updatedAt: { gte: since } },
  });
  if (!session.analysisSummary && used >= AI_INVOICE_FREE_ANALYSES_PER_DAY) {
    throw new Error("Limit analisa gratis habis");
  }

  const image = await aiImageStorage.get(session.referenceImageStorageKey);
  const analysis = await analyzeReferenceImage({ image: image.body, mimeType: image.contentType });

  return prisma.aiGenerationSession.update({
    where: { id: session.id },
    data: {
      status: "analyzed",
      analysisJson: analysis as unknown as Prisma.InputJsonValue,
      analysisSummary: analysis.summary,
    },
    include: { outputs: { orderBy: { createdAt: "desc" } } },
  });
}

export async function generateAiInvoiceOutput(
  userId: string,
  sessionId: string,
  input: { instruction: string; disclaimerAccepted: boolean; idempotencyKey: string }
) {
  if (!input.idempotencyKey) throw new Error("Idempotency key required");
  if (!input.disclaimerAccepted) throw new Error("Disclaimer wajib disetujui");
  const instruction = assertInstruction(input.instruction);

  const existing = await prisma.aiGenerationOutput.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;

  const session = await prisma.aiGenerationSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Sesi AI tidak ditemukan");
  if (!session.analysisSummary) throw new Error("Analisa gambar wajib dilakukan terlebih dahulu");

  const price = getAiInvoiceGenerationPrice();
  const prompt = buildPrompt({ analysisSummary: session.analysisSummary, instruction });

  const output = await prisma.$transaction(async (tx) => {
    const created = await tx.aiGenerationOutput.create({
      data: {
        sessionId: session.id,
        userId,
        status: "generating",
        instructionSnapshot: instruction,
        analysisSnapshot: session.analysisJson ?? undefined,
        promptSnapshot: prompt,
        chargedAmount: price,
        idempotencyKey: input.idempotencyKey,
        provider: "pollinations",
      },
    });
    const ledger = await debitWallet(
      tx,
      userId,
      price,
      "ai_generation_debit",
      input.idempotencyKey,
      "ai_generation_output",
      created.id,
      "Generate gambar invoice AI",
      "user",
      userId
    );
    await tx.aiGenerationSession.update({
      where: { id: session.id },
      data: {
        status: "generating",
        latestUserInstruction: instruction,
        disclaimerAcceptedAt: new Date(),
      },
    });
    return tx.aiGenerationOutput.update({
      where: { id: created.id },
      data: { walletLedgerEntryId: ledger.id },
    });
  });

  try {
    const generated = await generateInvoiceImage({ prompt });
    const key = buildAiOutputImageStorageKey({
      userId,
      sessionId: session.id,
      outputId: output.id,
      extension: extensionForMime(generated.mimeType),
    });
    await aiImageStorage.put(key, generated.image, generated.mimeType);
    return prisma.aiGenerationOutput.update({
      where: { id: output.id },
      data: {
        status: "success",
        outputImageStorageKey: key,
        outputImageMimeType: generated.mimeType,
        providerRequestId: generated.providerRequestId,
        providerMetadata: generated.metadata as Prisma.InputJsonValue,
        session: { update: { status: "completed" } },
      },
    });
  } catch {
    await prisma.$transaction(async (tx) => {
      const refund = await creditWallet(
        tx,
        userId,
        price,
        "refund_credit",
        `ai-generation-refund:${output.id}`,
        "ai_generation_output",
        output.id,
        "Refund generate gambar invoice AI gagal",
        "system",
        undefined
      );
      await tx.aiGenerationOutput.update({
        where: { id: output.id },
        data: { status: "refunded", refundLedgerEntryId: refund.id, errorMessage: "Generate AI gagal" },
      });
      await tx.aiGenerationSession.update({ where: { id: session.id }, data: { status: "failed" } });
    });
    throw new Error("Generate AI gagal");
  }
}

export async function getAiInvoiceOutputForDownload(userId: string, outputId: string) {
  const output = await prisma.aiGenerationOutput.findFirst({
    where: { id: outputId, userId, status: "success" },
  });
  if (!output?.outputImageStorageKey) throw new Error("Hasil AI tidak ditemukan");
  return aiImageStorage.get(output.outputImageStorageKey);
}
