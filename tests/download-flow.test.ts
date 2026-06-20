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

import { processDownload } from "@/modules/downloads/service";
import { prisma } from "@/lib/db/prisma";
import { debitWallet } from "@/modules/wallet/service";
import { generateInvoicePdf } from "@/lib/pdf/generator";

type InvoiceRecord = {
  id: string;
  userId: string;
  invoiceNumber: string;
  activeVersionId: string | null;
  template?: { htmlTemplate: string };
};

type InvoiceVersionRecord = {
  id: string;
  versionNumber: number;
  status: string;
  contentSnapshot: Record<string, unknown>;
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
    activeVersionId: "version-1",
    template: { htmlTemplate: "<div data-tpl='custom'>{{invoice.number}}</div>" },
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
      filename: "invoice-INV-001-v1.pdf",
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

  it("rejects unsupported version status safely", async () => {
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(
      mockVersion({ status: "processing_payment" })
    );

    await expect(processDownload("user-1", "invoice-1")).rejects.toThrow(
      /status versi tidak valid/i
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

    expect(result.filename).toBe("invoice-INV-001-v1.pdf");
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

  it("forwards the invoice template htmlTemplate to the pdf generator for unpaid download", async () => {
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
        template: { htmlTemplate: expect.stringContaining("data-tpl='custom'") },
      })
    );
  });

  it("forwards the invoice template htmlTemplate to the pdf generator for paid re-download", async () => {
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(
      mockVersion({ status: "paid" })
    );

    await processDownload("user-1", "invoice-1");

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        template: { htmlTemplate: expect.stringContaining("data-tpl='custom'") },
      })
    );
  });
});
