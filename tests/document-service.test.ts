import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    invoiceTemplate: {
      findUnique: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoiceVersion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/modules/invoices/content-hash", () => ({
  hashInvoiceContent: vi.fn((content: unknown) =>
    `hash-${JSON.stringify(content).slice(0, 20)}`
  ),
}));

import { createInvoice, editInvoice } from "@/modules/invoices/service";
import { prisma } from "@/lib/db/prisma";
import {
  getDefaultGoCarReceiptContent,
} from "@/modules/documents/gocar-receipt-content.schema";
import { getDefaultInvoiceContent } from "@/modules/documents/default-content";

const prismaMock = prisma as unknown as {
  invoiceTemplate: { findUnique: ReturnType<typeof vi.fn> };
  invoice: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  invoiceVersion: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

// ── Test data ────────────────────────────────────────────────────────────────

const invoiceContent = getDefaultInvoiceContent();
const gocarContent = getDefaultGoCarReceiptContent();

const invoiceTemplate = {
  id: "tpl-invoice-1",
  name: "Invoice Profesional",
  documentType: "invoice",
  htmlTemplate: "<div>invoice tpl</div>",
  status: "active",
};

const gocarTemplate = {
  id: "tpl-gocar-1",
  name: "GoCar Receipt",
  documentType: "gocar_receipt",
  htmlTemplate: "<div>gocar tpl</div>",
  status: "active",
};

const storedInvoice = {
  id: "inv-1",
  userId: "user-1",
  templateId: "tpl-invoice-1",
  documentType: "invoice",
  invoiceNumber: "INV-001",
  title: "INV-001",
  status: "active",
  activeVersionId: "ver-1",
};

const storedGocarInvoice = {
  id: "inv-2",
  userId: "user-1",
  templateId: "tpl-gocar-1",
  documentType: "gocar_receipt",
  invoiceNumber: "",
  title: "GoCar RB-4153088-49607870",
  status: "active",
  activeVersionId: "ver-2",
};

const activeVersionUnpaid = {
  id: "ver-1",
  invoiceId: "inv-1",
  versionNumber: 1,
  status: "unpaid",
  contentSnapshot: invoiceContent,
  contentHash: "hash-1",
};

const activeVersionPaid = {
  id: "ver-1",
  invoiceId: "inv-1",
  versionNumber: 1,
  status: "paid",
  contentSnapshot: invoiceContent,
  contentHash: "hash-1",
};

// ── createInvoice tests ─────────────────────────────────────────────────────

describe("createInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an invoice document with invoice template (documentType=invoice)", async () => {
    prismaMock.invoiceTemplate.findUnique.mockResolvedValue(invoiceTemplate);

    const invRow = {
      id: "inv-created",
      userId: "user-1",
      templateId: "tpl-invoice-1",
      documentType: "invoice",
      invoiceNumber: invoiceContent.meta.invoiceNumber,
      title: invoiceContent.meta.invoiceNumber,
      status: "draft",
    };
    const verRow = {
      id: "ver-created",
      invoiceId: "inv-created",
      versionNumber: 1,
      status: "unpaid",
      contentSnapshot: invoiceContent,
      contentHash: expect.any(String),
    };

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: unknown) => unknown) =>
        cb({
          invoice: {
            create: vi.fn().mockResolvedValue(invRow),
            update: vi.fn().mockResolvedValue(undefined),
          },
          invoiceVersion: {
            create: vi.fn().mockResolvedValue(verRow),
          },
        })
    );

    const result = await createInvoice("user-1", "tpl-invoice-1", invoiceContent);

    expect(prismaMock.invoiceTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: "tpl-invoice-1", status: "active" },
    });
    expect(result.invoice.documentType).toBe("invoice");
    expect(result.invoice.title).toBe(invoiceContent.meta.invoiceNumber);
    expect(result.invoice.invoiceNumber).toBe(invoiceContent.meta.invoiceNumber);
    expect(result.version.status).toBe("unpaid");
  });

  it("creates a GoCar receipt document with GoCar template (documentType=gocar_receipt)", async () => {
    prismaMock.invoiceTemplate.findUnique.mockResolvedValue(gocarTemplate);

    const invRow = {
      id: "inv-gocar",
      userId: "user-1",
      templateId: "tpl-gocar-1",
      documentType: "gocar_receipt",
      invoiceNumber: "",
      title: "GoCar RB-4153088-49607870",
      status: "draft",
    };
    const verRow = {
      id: "ver-gocar",
      invoiceId: "inv-gocar",
      versionNumber: 1,
      status: "unpaid",
      contentSnapshot: gocarContent,
      contentHash: expect.any(String),
    };

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: unknown) => unknown) =>
        cb({
          invoice: {
            create: vi.fn().mockResolvedValue(invRow),
            update: vi.fn().mockResolvedValue(undefined),
          },
          invoiceVersion: {
            create: vi.fn().mockResolvedValue(verRow),
          },
        })
    );

    const result = await createInvoice("user-1", "tpl-gocar-1", gocarContent);

    expect(result.invoice.documentType).toBe("gocar_receipt");
    expect(result.invoice.title).toBe("GoCar RB-4153088-49607870");
    expect(result.invoice.invoiceNumber).toBe("");
  });

  it("throws ZodError when passing invoice content to GoCar template", async () => {
    prismaMock.invoiceTemplate.findUnique.mockResolvedValue(gocarTemplate);

    await expect(
      createInvoice("user-1", "tpl-gocar-1", invoiceContent)
    ).rejects.toThrow();
  });

  it("throws ZodError when passing GoCar content to invoice template", async () => {
    prismaMock.invoiceTemplate.findUnique.mockResolvedValue(invoiceTemplate);

    await expect(
      createInvoice("user-1", "tpl-invoice-1", gocarContent)
    ).rejects.toThrow();
  });

  it("throws when template is not found", async () => {
    prismaMock.invoiceTemplate.findUnique.mockResolvedValue(null);

    await expect(
      createInvoice("user-1", "tpl-missing", invoiceContent)
    ).rejects.toThrow("Template tidak ditemukan atau tidak aktif");
  });

  it("throws when template is inactive", async () => {
    prismaMock.invoiceTemplate.findUnique.mockResolvedValue(null);

    await expect(
      createInvoice("user-1", "tpl-invoice-1", invoiceContent)
    ).rejects.toThrow("Template tidak ditemukan atau tidak aktif");
  });
});

// ── editInvoice tests ───────────────────────────────────────────────────────

describe("editInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("overwrites unpaid version content and updates title", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(storedInvoice);
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(activeVersionUnpaid);
    prismaMock.invoiceVersion.update.mockResolvedValue({
      ...activeVersionUnpaid,
      contentSnapshot: { ...invoiceContent, meta: { invoiceNumber: "INV-002" } },
      contentHash: "hash-new",
    });
    prismaMock.invoice.update.mockResolvedValue(undefined);

    const modified = {
      ...invoiceContent,
      meta: { ...invoiceContent.meta, invoiceNumber: "INV-002" },
    };

    const result = await editInvoice("user-1", "inv-1", modified);

    expect(result.isNewVersion).toBe(false);
    expect(result.version.contentHash).toBe("hash-new");
    expect(prismaMock.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { title: "INV-002", invoiceNumber: "INV-002" },
    });
  });

  it("creates new unpaid version when active version is paid", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(storedInvoice);
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(activeVersionPaid);
    prismaMock.invoiceVersion.findFirst.mockResolvedValue({ versionNumber: 1 });

    const newVer = {
      id: "ver-2",
      invoiceId: "inv-1",
      versionNumber: 2,
      status: "unpaid",
      contentSnapshot: invoiceContent,
      contentHash: "hash-2",
    };

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: unknown) => unknown) =>
        cb({
          invoiceVersion: {
            create: vi.fn().mockResolvedValue(newVer),
          },
          invoice: {
            update: vi.fn().mockResolvedValue(undefined),
          },
        })
    );

    const result = await editInvoice("user-1", "inv-1", invoiceContent);

    expect(result.isNewVersion).toBe(true);
    expect(result.version.versionNumber).toBe(2);
    expect(result.version.status).toBe("unpaid");
  });

  it("updates title when editing GoCar receipt", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(storedGocarInvoice);
    prismaMock.invoiceVersion.findUnique.mockResolvedValue({
      id: "ver-2",
      invoiceId: "inv-2",
      versionNumber: 1,
      status: "unpaid",
      contentSnapshot: gocarContent,
      contentHash: "hash-gocar",
    });
    prismaMock.invoiceVersion.update.mockResolvedValue({
      id: "ver-2",
      invoiceId: "inv-2",
      versionNumber: 1,
      status: "unpaid",
      contentSnapshot: gocarContent,
      contentHash: "hash-gocar-v2",
    });
    prismaMock.invoice.update.mockResolvedValue(undefined);

    const modified = {
      ...gocarContent,
      service: { ...gocarContent.service, orderId: "RB-999" },
    };

    const result = await editInvoice("user-1", "inv-2", modified);

    expect(result.isNewVersion).toBe(false);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-2" },
      data: { title: "GoCar RB-999", invoiceNumber: "" },
    });
  });

  it("throws when invoice is not found", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    await expect(
      editInvoice("user-1", "inv-missing", invoiceContent)
    ).rejects.toThrow("Invoice tidak ditemukan");
  });

  it("throws when active version is missing", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(storedInvoice);
    prismaMock.invoiceVersion.findUnique.mockResolvedValue(null);

    await expect(
      editInvoice("user-1", "inv-1", invoiceContent)
    ).rejects.toThrow("Versi aktif tidak ditemukan");
  });

  it("throws when version status is invalid", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(storedInvoice);
    prismaMock.invoiceVersion.findUnique.mockResolvedValue({
      ...activeVersionUnpaid,
      status: "processing_payment",
    });

    await expect(
      editInvoice("user-1", "inv-1", invoiceContent)
    ).rejects.toThrow("Status versi tidak valid untuk diedit");
  });
});
