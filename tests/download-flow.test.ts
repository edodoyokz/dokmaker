import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
    },
    invoiceVersion: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
    },
    downloadLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock("@/modules/wallet/service", () => ({
  debitWallet: vi.fn(),
}));

vi.mock("@/lib/pdf/generator", () => ({
  generateInvoicePdf: vi.fn(),
}));

vi.mock("@/modules/downloads/pdf-storage", () => ({
  pdfStorage: {
    put: vi.fn(),
    get: vi.fn(),
  },
  buildInvoiceFinalPdfStorageKey: vi.fn(
    (input: {
      userId: string;
      invoiceId: string;
      versionId: string;
      contentHash?: string | null;
    }) =>
      `invoice-finals/${input.userId}/${input.invoiceId}/${input.versionId}.pdf`
  ),
}));

import { processDownload } from "@/modules/downloads/service";
import { prisma } from "@/lib/db/prisma";
import { debitWallet } from "@/modules/wallet/service";
import { generateInvoicePdf } from "@/lib/pdf/generator";
import {
  pdfStorage,
  buildInvoiceFinalPdfStorageKey,
} from "@/modules/downloads/pdf-storage";

type InvoiceRecord = {
  id: string;
  userId: string;
  invoiceNumber: string;
  documentType: string;
  title?: string | null;
  activeVersionId: string | null;
  template?: { htmlTemplate: string; documentType: string };
};

type InvoiceVersionRecord = {
  id: string;
  versionNumber: number;
  status: string;
  contentSnapshot: Record<string, unknown>;
  storageKey?: string | null;
  contentHash?: string | null;
  updatedAt?: Date;
};

type WalletRecord = {
  id: string;
  userId: string;
  currentBalance: number;
};

type DownloadTxMock = {
  invoiceVersion: {
    update: ReturnType<typeof vi.fn>;
  };
  downloadLog: {
    create: ReturnType<typeof vi.fn>;
  };
};

const prismaMock = prisma as unknown as {
  invoice: { findUnique: ReturnType<typeof vi.fn> };
  invoiceVersion: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  wallet: { findUnique: ReturnType<typeof vi.fn> };
  downloadLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};
const debitWalletMock = debitWallet as unknown as ReturnType<typeof vi.fn>;
const generateInvoicePdfMock = generateInvoicePdf as unknown as ReturnType<
  typeof vi.fn
>;
const pdfStorageMock = pdfStorage as unknown as {
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};
const buildKeyMock =
  buildInvoiceFinalPdfStorageKey as unknown as ReturnType<typeof vi.fn>;

const sampleContent = {
  sender: { name: "DokMaker Studio" },
  client: { name: "Client Example" },
  meta: {
    invoiceNumber: "INV-001",
    issueDate: "2026-06-12",
    currency: "IDR",
  },
  items: [{ description: "Design", quantity: 1, unitPrice: 10000 }],
};

function mockInvoice(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: "invoice-1",
    userId: "user-1",
    invoiceNumber: "INV-001",
    documentType: "invoice",
    title: null,
    activeVersionId: "version-1",
    template: { htmlTemplate: "<div data-tpl='custom'>{{invoice.number}}</div>", documentType: "invoice" },
    ...overrides,
  };
}

function mockVersion(
  overrides: Partial<InvoiceVersionRecord> = {}
): InvoiceVersionRecord {
  return {
    id: "version-1",
    versionNumber: 1,
    status: "unpaid",
    contentSnapshot: sampleContent,
    storageKey: null,
    contentHash: "hash-1",
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockWallet(overrides: Partial<WalletRecord> = {}): WalletRecord {
  return {
    id: "wallet-1",
    userId: "user-1",
    currentBalance: 50000,
    ...overrides,
  };
}

describe("processDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.invoice.findUnique.mockResolvedValue(mockInvoice());
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(mockVersion());
    prismaMock.invoiceVersion.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.invoiceVersion.update.mockResolvedValue(undefined);
    prismaMock.wallet.findUnique.mockResolvedValue(mockWallet());
    generateInvoicePdfMock.mockResolvedValue(Buffer.from("%PDF-test"));
  });

  it("rejects unpaid version with insufficient balance before PDF generation", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(
      mockWallet({ currentBalance: 5000 })
    );

    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /saldo tidak mencukupi/i
    );

    expect(generateInvoicePdfMock).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(debitWalletMock).not.toHaveBeenCalled();
  });

  it("does not debit wallet or mark version paid when PDF generation fails", async () => {
    generateInvoicePdfMock.mockRejectedValue(new Error("PDF engine unavailable"));

    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /pdf engine unavailable/i
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(debitWalletMock).not.toHaveBeenCalled();
  });

  it("returns free re-download for paid version", async () => {
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(
      mockVersion({ status: "paid" })
    );

    const pdfBuffer = Buffer.from("%PDF-paid");
    generateInvoicePdfMock.mockResolvedValue(pdfBuffer);
    prismaMock.downloadLog.create.mockResolvedValue({ id: "download-1" });

    const result = await processDownload("user-1", "invoice-1");

    expect(result).toEqual({
      pdf: pdfBuffer,
      filename: "INV-001.pdf",
    });
    expect(prismaMock.downloadLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        invoiceVersionId: "version-1",
        wasPaidDownload: false,
        amount: 0,
      },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(debitWalletMock).not.toHaveBeenCalled();
  });

  it("rejects fresh processing_payment version with a safe message", async () => {
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(
      mockVersion({
        status: "processing_payment",
        updatedAt: new Date(Date.now() - 10_000), // 10 seconds ago
      })
    );

    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /sedang diproses/i
    );

    expect(prismaMock.invoiceVersion.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(debitWalletMock).not.toHaveBeenCalled();
  });

  it("recovers stale processing_payment version and proceeds with paid download", async () => {
    const staleUpdatedAt = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
    prismaMock.invoiceVersion.findUnique
      .mockResolvedValueOnce(
        mockVersion({
          status: "processing_payment",
          updatedAt: staleUpdatedAt,
        })
      )
      .mockResolvedValueOnce(
        mockVersion({
          status: "unpaid",
          updatedAt: staleUpdatedAt,
        })
      );

    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: DownloadTxMock) => unknown) =>
        callback({
          invoiceVersion: { update: updateMock },
          downloadLog: { create: createMock },
        })
    );

    const result = await processDownload("user-1", "invoice-1");

    expect(result.filename).toBe("INV-001.pdf");
    // Reset call
    expect(prismaMock.invoiceVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "version-1", status: "processing_payment" },
      data: { status: "unpaid" },
    });
    // Claim call
    expect(prismaMock.invoiceVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "version-1", status: "unpaid" },
      data: { status: "processing_payment" },
    });
    expect(debitWalletMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: expect.objectContaining({ status: "paid" }),
    });
  });

  it("throws safely if stale processing_payment version cannot be reset to unpaid", async () => {
    const staleUpdatedAt = new Date(Date.now() - 6 * 60 * 1000);
    prismaMock.invoiceVersion.findUnique
      .mockResolvedValueOnce(
        mockVersion({
          status: "processing_payment",
          updatedAt: staleUpdatedAt,
        })
      )
      .mockResolvedValueOnce(
        mockVersion({
          status: "paid", // concurrent worker already paid it
          updatedAt: staleUpdatedAt,
        })
      );

    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /sedang diproses atau sudah dibayar/i
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(debitWalletMock).not.toHaveBeenCalled();
  });

  it("uses transactional debit and paid transition exactly once for unpaid version", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: DownloadTxMock) => unknown) =>
        callback({
          invoiceVersion: {
            update: updateMock,
          },
          downloadLog: {
            create: createMock,
          },
        })
    );

    const result = await processDownload("user-1", "invoice-1");

    expect(result.filename).toBe("INV-001.pdf");
    expect(generateInvoicePdfMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(debitWalletMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: expect.objectContaining({
        status: "paid",
      }),
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        invoiceVersionId: "version-1",
        wasPaidDownload: true,
        amount: 10000,
      },
    });
  });

  it("returns existing result without extra debit when debitWallet detects duplicate idempotency key", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: DownloadTxMock) => unknown) =>
        callback({
          invoiceVersion: {
            update: updateMock,
          },
          downloadLog: {
            create: createMock,
          },
        })
    );

    debitWalletMock.mockResolvedValue({ id: "existing-ledger" });

    await processDownload("user-1", "invoice-1");

    expect(debitWalletMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      10000,
      "download_debit",
      "download:invoice-1:1",
      "invoice_version",
      "version-1",
      expect.stringContaining("INV-001"),
      "user",
      "user-1"
    );
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("forwards the invoice template htmlTemplate and documentType to the pdf generator for unpaid download", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: DownloadTxMock) => unknown) =>
        callback({
          invoiceVersion: {
            update: updateMock,
          },
          downloadLog: {
            create: createMock,
          },
        })
    );

    await processDownload("user-1", "invoice-1");

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        template: expect.objectContaining({
          htmlTemplate: expect.stringContaining("data-tpl='custom'"),
          documentType: "invoice",
        }),
      })
    );
  });

  it("forwards the invoice template htmlTemplate and documentType to the pdf generator for paid re-download", async () => {
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(
      mockVersion({ status: "paid" })
    );

    await processDownload("user-1", "invoice-1");

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        template: expect.objectContaining({
          htmlTemplate: expect.stringContaining("data-tpl='custom'"),
          documentType: "invoice",
        }),
      })
    );
  });

  it("uses the stored template for GoCar final PDF generation so preview and download match", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(
      mockInvoice({
        documentType: "gocar_receipt",
        template: {
          htmlTemplate: "<div>stale-db-template</div>",
          documentType: "gocar_receipt",
        },
      })
    );

    await processDownload("user-1", "invoice-1");

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        template: expect.objectContaining({
          htmlTemplate: "<div>stale-db-template</div>",
          documentType: "gocar_receipt",
        }),
      })
    );
  });

  it("stores generated PDF and sets storageKey when unpaid version becomes paid", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: DownloadTxMock) => unknown) =>
        callback({
          invoiceVersion: { update: updateMock },
          downloadLog: { create: createMock },
        })
    );
    pdfStorageMock.put.mockResolvedValue(undefined);
    buildKeyMock.mockReturnValue(
      "invoice-finals/user-1/invoice-1/version-1-hash1.pdf"
    );

    await processDownload("user-1", "invoice-1");

    // PDF is stored BEFORE the transaction marks version paid
    expect(pdfStorageMock.put).toHaveBeenCalledTimes(1);
    expect(pdfStorageMock.put).toHaveBeenCalledWith(
      "invoice-finals/user-1/invoice-1/version-1-hash1.pdf",
      expect.any(Buffer)
    );
    // Version update inside transaction includes storageKey
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: expect.objectContaining({
        status: "paid",
        storageKey:
          "invoice-finals/user-1/invoice-1/version-1-hash1.pdf",
      }),
    });
  });

  it("reads PDF from storage instead of regenerating when paid version has storageKey", async () => {
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(
      mockVersion({
        status: "paid",
        storageKey: "invoice-finals/user-1/invoice-1/version-1.pdf",
      })
    );
    const storedPdf = Buffer.from("%PDF-stored-final");
    pdfStorageMock.get.mockResolvedValue(storedPdf);

    const result = await processDownload("user-1", "invoice-1");

    expect(pdfStorageMock.get).toHaveBeenCalledWith(
      "invoice-finals/user-1/invoice-1/version-1.pdf"
    );
    expect(generateInvoicePdfMock).not.toHaveBeenCalled();
    expect(result.pdf).toBe(storedPdf);
  });

  it("uses invoice.title as filename prefix when set (GoCar receipt)", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(
      mockInvoice({
        documentType: "gocar_receipt",
        title: "GoCar RB-4153",
      })
    );

    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: DownloadTxMock) => unknown) =>
        callback({
          invoiceVersion: { update: updateMock },
          downloadLog: { create: createMock },
        })
    );

    const result = await processDownload("user-1", "invoice-1");

    expect(result.filename).toBe("GoCar RB-4153.pdf");
    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        template: expect.objectContaining({
          documentType: "gocar_receipt",
        }),
      })
    );
  });

  it("regenerates and stores PDF when paid version lost its storageKey (migration safety)", async () => {
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(
      mockVersion({ status: "paid", storageKey: null })
    );
    pdfStorageMock.put.mockResolvedValue(undefined);
    buildKeyMock.mockReturnValue(
      "invoice-finals/user-1/invoice-1/version-1-recovered.pdf"
    );

    await processDownload("user-1", "invoice-1");

    expect(generateInvoicePdfMock).toHaveBeenCalledTimes(1);
    expect(pdfStorageMock.put).toHaveBeenCalledTimes(1);
    expect(prismaMock.invoiceVersion.update).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: {
        storageKey:
          "invoice-finals/user-1/invoice-1/version-1-recovered.pdf",
      },
    });
  });

  it("resets version to unpaid when PDF generation fails after status claim (no debit)", async () => {
    // Claim succeeds (status moves to processing_payment), then PDF generation throws.
    generateInvoicePdfMock.mockRejectedValue(new Error("PDF engine down"));

    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /pdf engine down/i
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(debitWalletMock).not.toHaveBeenCalled();
    // Catch must reset processing_payment -> unpaid so user can retry.
    expect(prismaMock.invoiceVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "version-1", status: "processing_payment" },
      data: { status: "unpaid" },
    });
  });

  it("resets version to unpaid when storage put fails before debit (no debit)", async () => {
    // PDF generates, but storage upload throws before wallet debit.
    pdfStorageMock.put.mockRejectedValue(new Error("R2 timeout"));

    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /r2 timeout/i
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(debitWalletMock).not.toHaveBeenCalled();
    expect(prismaMock.invoiceVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "version-1", status: "processing_payment" },
      data: { status: "unpaid" },
    });
  });

  it("can retry successfully after a transient PDF generation failure and charges exactly once", async () => {
    // First attempt: PDF generation fails, status resets to unpaid.
    generateInvoicePdfMock.mockRejectedValueOnce(
      new Error("PDF engine transient")
    );
    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /pdf engine transient/i
    );
    expect(prismaMock.invoiceVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "version-1", status: "processing_payment" },
      data: { status: "unpaid" },
    });

    // Second attempt: full success path.
    vi.clearAllMocks();
    prismaMock.invoice.findUnique.mockResolvedValue(mockInvoice());
    // After reset, version reads as unpaid again.
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(mockVersion());
    prismaMock.invoiceVersion.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.wallet.findUnique.mockResolvedValue(mockWallet());
    generateInvoicePdfMock.mockResolvedValue(Buffer.from("%PDF-retry"));
    pdfStorageMock.put.mockResolvedValue(undefined);
    buildKeyMock.mockReturnValue(
      "invoice-finals/user-1/invoice-1/version-1-retry.pdf"
    );

    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: DownloadTxMock) => unknown) =>
        callback({
          invoiceVersion: { update: updateMock },
          downloadLog: { create: createMock },
        })
    );

    const result = await processDownload("user-1", "invoice-1");

    expect(result.filename).toBe("INV-001.pdf");
    expect(debitWalletMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: expect.objectContaining({ status: "paid" }),
    });
  });
});
