import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { creditWallet, debitWallet } from "@/modules/wallet/service";
import {
  AI_INVOICE_ALLOWED_MIME_TYPES,
  AI_INVOICE_FREE_ANALYSES_PER_DAY,
  AI_INVOICE_MAX_IMAGE_BYTES,
  getAiInvoiceGenerationPrice,
} from "./constants";
import { analyzeReferenceImage, generateInvoiceImage, type AiInvoiceAnalysis } from "./pollinations";
import {
  aiImageStorage,
  buildAiOutputImageStorageKey,
  buildAiReferenceImageStorageKey,
} from "./storage";

export interface AiInvoiceFieldEdit {
  label: string;
  from: string;
  to: string;
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function assertChanges(input: { fieldEdits: AiInvoiceFieldEdit[]; instruction: string }): {
  fieldEdits: AiInvoiceFieldEdit[];
  instruction: string;
} {
  const instruction = input.instruction.trim();
  if (instruction.length > 2000) throw new Error("Instruksi perubahan terlalu panjang");
  const fieldEdits = input.fieldEdits.filter((e) => e.label && e.to && e.to !== e.from);
  if (!fieldEdits.length && !instruction) {
    throw new Error("Pilih minimal satu field untuk diubah atau tulis instruksi");
  }
  return { fieldEdits, instruction };
}

function buildPrompt(input: {
  analysis: AiInvoiceAnalysis;
  fieldEdits: AiInvoiceFieldEdit[];
  instruction: string;
}): string {
  const lines: string[] = [
    "Edit the provided reference invoice image. Keep the layout, colors, and every unchanged field identical to the reference.",
    `Document type: ${input.analysis.documentType}`,
  ];
  if (input.analysis.colors.length) {
    lines.push(`Dominant colors: ${input.analysis.colors.join(", ")}`);
  }
  if (input.analysis.sections.length) {
    lines.push(`Layout sections: ${input.analysis.sections.join(", ")}`);
  }
  if (input.fieldEdits.length) {
    lines.push("Field changes (apply exactly, keep formatting):");
    for (const edit of input.fieldEdits) {
      lines.push(`- ${edit.label}: "${edit.from}" → "${edit.to}"`);
    }
  }
  if (input.instruction) {
    lines.push(`Additional instructions: ${input.instruction}`);
  }
  lines.push("Do not add watermark. Use sharp readable text. Keep the portrait invoice orientation.");
  return lines.join("\n");
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
  input: { fieldEdits: AiInvoiceFieldEdit[]; instruction: string; disclaimerAccepted: boolean; idempotencyKey: string }
) {
  if (!input.idempotencyKey) throw new Error("Idempotency key required");
  if (!input.disclaimerAccepted) throw new Error("Disclaimer wajib disetujui");
  const { fieldEdits, instruction } = assertChanges(input);

  const existing = await prisma.aiGenerationOutput.findFirst({ where: { idempotencyKey: input.idempotencyKey, userId } });
  if (existing) return existing;

  const session = await prisma.aiGenerationSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Sesi AI tidak ditemukan");
  if (!session.analysisJson) throw new Error("Analisa gambar wajib dilakukan terlebih dahulu");

  const analysis = session.analysisJson as unknown as AiInvoiceAnalysis;
  const price = getAiInvoiceGenerationPrice();
  const prompt = buildPrompt({ analysis, fieldEdits, instruction });

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
    const reference = await aiImageStorage.get(session.referenceImageStorageKey);
    const generated = await generateInvoiceImage({
      prompt,
      referenceImage: { body: reference.body, mimeType: reference.contentType },
    });
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
  } catch (cause) {
    console.error("[ai-invoice] generation failed for output", output.id, cause);
    try {
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
    } catch (refundError) {
      // ponytail: refund itself failed — the debit is orphaned and the output stays "generating".
      // Ceiling: add an admin reconciliation query/cron for outputs in status="generating" older
      // than N minutes with a debited wallet_ledger_entry, and refund them manually. Upgrade path
      // before scaling this feature to production traffic.
      console.error("AI invoice refund failed for output", output.id, refundError);
    }
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
