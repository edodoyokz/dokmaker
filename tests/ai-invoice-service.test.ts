import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AI invoice config", () => {
  const originalEnv = process.env.AI_INVOICE_GENERATION_PRICE_IDR;

  afterEach(() => {
    process.env.AI_INVOICE_GENERATION_PRICE_IDR = originalEnv;
    vi.resetModules();
  });

  it("uses server env price when valid", async () => {
    process.env.AI_INVOICE_GENERATION_PRICE_IDR = "15000";
    const { getAiInvoiceGenerationPrice } = await import(
      "@/modules/ai-invoice/constants"
    );
    expect(getAiInvoiceGenerationPrice()).toBe(15000);
  });

  it("falls back to default price when env is missing", async () => {
    delete process.env.AI_INVOICE_GENERATION_PRICE_IDR;
    const { getAiInvoiceGenerationPrice } = await import(
      "@/modules/ai-invoice/constants"
    );
    expect(getAiInvoiceGenerationPrice()).toBe(10000);
  });
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    aiGenerationSession: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    aiGenerationOutput: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/modules/wallet/service", () => ({
  debitWallet: vi.fn(),
  creditWallet: vi.fn(),
}));

vi.mock("@/modules/ai-invoice/storage", () => ({
  aiImageStorage: { put: vi.fn(), get: vi.fn() },
  buildAiReferenceImageStorageKey: vi.fn(() => "ai-invoice/reference/user-1/session-1.png"),
  buildAiOutputImageStorageKey: vi.fn(() => "ai-invoice/output/user-1/session-1/output-1.jpg"),
}));

vi.mock("@/modules/ai-invoice/pollinations", () => ({
  analyzeReferenceImage: vi.fn(),
  generateInvoiceImage: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { debitWallet, creditWallet } from "@/modules/wallet/service";
import { aiImageStorage } from "@/modules/ai-invoice/storage";
import { analyzeReferenceImage, generateInvoiceImage } from "@/modules/ai-invoice/pollinations";

const prismaMock = prisma as unknown as {
  aiGenerationSession: Record<string, ReturnType<typeof vi.fn>>;
  aiGenerationOutput: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};
const debitWalletMock = debitWallet as unknown as ReturnType<typeof vi.fn>;
const creditWalletMock = creditWallet as unknown as ReturnType<typeof vi.fn>;
const storageMock = aiImageStorage as unknown as { put: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
const analyzeMock = analyzeReferenceImage as unknown as ReturnType<typeof vi.fn>;
const generateMock = generateInvoiceImage as unknown as ReturnType<typeof vi.fn>;

describe("AI invoice service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_INVOICE_GENERATION_PRICE_IDR = "10000";
    prismaMock.$transaction.mockImplementation(async (callback) => callback({
      aiGenerationOutput: prismaMock.aiGenerationOutput,
      aiGenerationSession: prismaMock.aiGenerationSession,
    }));
  });

  it("rejects non-image upload", async () => {
    const { createAiInvoiceSession } = await import("@/modules/ai-invoice/service");
    await expect(
      createAiInvoiceSession("user-1", {
        name: "bad.txt",
        type: "text/plain",
        size: 10,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      } as File)
    ).rejects.toThrow("File harus berupa gambar JPG, PNG, atau WebP");
  });

  it("does not debit twice for same idempotency key", async () => {
    prismaMock.aiGenerationSession.findFirst.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      analysisJson: { summary: "x" },
      analysisSummary: "x",
    });
    prismaMock.aiGenerationOutput.findUnique.mockResolvedValue({ id: "output-existing", status: "success" });
    const { generateAiInvoiceOutput } = await import("@/modules/ai-invoice/service");

    const result = await generateAiInvoiceOutput("user-1", "session-1", {
      instruction: "ubah warna biru",
      disclaimerAccepted: true,
      idempotencyKey: "idem-1",
    });

    expect(result.id).toBe("output-existing");
    expect(debitWalletMock).not.toHaveBeenCalled();
  });

  it("refunds once when provider fails after debit", async () => {
    prismaMock.aiGenerationSession.findFirst.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      analysisJson: { summary: "layout" },
      analysisSummary: "layout",
    });
    prismaMock.aiGenerationOutput.findUnique.mockResolvedValue(null);
    prismaMock.aiGenerationOutput.create.mockResolvedValue({ id: "output-1" });
    debitWalletMock.mockResolvedValue({ id: "ledger-debit-1" });
    creditWalletMock.mockResolvedValue({ id: "ledger-refund-1" });
    generateMock.mockRejectedValue(new Error("provider down"));
    prismaMock.aiGenerationOutput.update.mockResolvedValue({ id: "output-1", status: "refunded" });
    const { generateAiInvoiceOutput } = await import("@/modules/ai-invoice/service");

    await expect(
      generateAiInvoiceOutput("user-1", "session-1", {
        instruction: "ubah nama",
        disclaimerAccepted: true,
        idempotencyKey: "idem-fail",
      })
    ).rejects.toThrow("Generate AI gagal");

    expect(debitWalletMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      10000,
      "ai_generation_debit",
      "idem-fail",
      "ai_generation_output",
      "output-1",
      expect.any(String),
      "user",
      "user-1"
    );
    expect(creditWalletMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      10000,
      "refund_credit",
      "ai-generation-refund:output-1",
      "ai_generation_output",
      "output-1",
      expect.any(String),
      "system",
      undefined
    );
  });
});
