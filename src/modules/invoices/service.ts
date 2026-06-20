import { prisma } from "@/lib/db/prisma";
import type { InvoiceContent } from "./invoice-content.schema";
import type { GoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";
import { hashInvoiceContent } from "./content-hash";
import { getDocumentTypeDefinition } from "@/modules/documents/document-type-registry";
import { Prisma } from "@prisma/client";

/**
 * Derive a human-readable display title based on document type.
 */
function deriveDocumentTitle(documentType: string, content: unknown): string {
  if (documentType === "invoice") {
    const c = content as InvoiceContent;
    return c.meta?.invoiceNumber || "Invoice";
  }
  if (documentType === "gocar_receipt") {
    const c = content as GoCarReceiptContent;
    const parts = [c.service?.name, c.service?.orderId].filter(Boolean);
    return parts.join(" ") || "GoCar Receipt";
  }
  return "Untitled document";
}

/**
 * Serialize validated (unknown) content to a JSON-safe value for Prisma.
 * The content has already been validated by the registry schema so it is
 * guaranteed to be a plain object.
 */
function toJsonValue(content: unknown): Prisma.InputJsonValue {
  return content as Prisma.InputJsonValue;
}

/**
 * Create a new document (invoice / GoCar receipt / …) draft from a template.
 * Validates content against the document-type-specific schema from the registry.
 * Creates version 1 (unpaid) and sets it as active.
 */
export async function createInvoice(
  userId: string,
  templateId: string,
  content: unknown
) {
  // Verify template exists and is active
  const template = await prisma.invoiceTemplate.findUnique({
    where: { id: templateId, status: "active" },
  });

  if (!template) {
    throw new Error("Template tidak ditemukan atau tidak aktif");
  }

  // Validate content against the template's document type schema
  const definition = getDocumentTypeDefinition(template.documentType);
  const validated = definition.schema.parse(content);
  const title = deriveDocumentTitle(template.documentType, validated);
  const invoiceNumber =
    template.documentType === "invoice"
      ? (validated as InvoiceContent).meta.invoiceNumber
      : "";

  // Create invoice with first version in a transaction
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        userId,
        templateId,
        documentType: template.documentType,
        title,
        invoiceNumber,
        status: "draft",
      },
    });

    const version = await tx.invoiceVersion.create({
      data: {
        invoiceId: invoice.id,
        versionNumber: 1,
        status: "unpaid",
        contentSnapshot: toJsonValue(validated),
        contentHash: hashInvoiceContent(validated),
      },
    });

    // Set active version
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        activeVersionId: version.id,
        status: "active",
      },
    });

    return { invoice, version };
  });
}

/**
 * Edit a document. Validates content against the document's registered type.
 * Handles versioning rules:
 * - Unpaid active version: overwrite content + title
 * - Paid active version: create new unpaid version
 */
export async function editInvoice(
  userId: string,
  invoiceId: string,
  content: unknown
) {
  // Verify ownership and fetch document type
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId },
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan");
  }

  if (!invoice.activeVersionId) {
    throw new Error("Invoice tidak memiliki versi aktif");
  }

  // Validate content against the document's registered type
  const definition = getDocumentTypeDefinition(invoice.documentType);
  const validated = definition.schema.parse(content);
  const title = deriveDocumentTitle(invoice.documentType, validated);
  const invoiceNumber =
    invoice.documentType === "invoice"
      ? (validated as InvoiceContent).meta.invoiceNumber
      : "";

  const activeVersion = await prisma.invoiceVersion.findUnique({
    where: { id: invoice.activeVersionId },
  });

  if (!activeVersion) {
    throw new Error("Versi aktif tidak ditemukan");
  }

  if (activeVersion.status === "unpaid") {
    // Overwrite existing unpaid version
    const updated = await prisma.invoiceVersion.update({
      where: { id: activeVersion.id },
      data: {
        contentSnapshot: toJsonValue(validated),
        contentHash: hashInvoiceContent(validated),
      },
    });

    // Update invoice row title + invoiceNumber (if changed)
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { title, invoiceNumber },
    });

    return { invoice, version: updated, isNewVersion: false };
  }

  if (activeVersion.status === "paid") {
    // Create new unpaid version
    const maxVersion = await prisma.invoiceVersion.findFirst({
      where: { invoiceId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const newVersionNumber = (maxVersion?.versionNumber ?? 0) + 1;

    return prisma.$transaction(async (tx) => {
      const newVersion = await tx.invoiceVersion.create({
        data: {
          invoiceId,
          versionNumber: newVersionNumber,
          status: "unpaid",
          contentSnapshot: toJsonValue(validated),
          contentHash: hashInvoiceContent(validated),
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          activeVersionId: newVersion.id,
          title,
          invoiceNumber,
        },
      });

      return { invoice, version: newVersion, isNewVersion: true };
    });
  }

  throw new Error("Status versi tidak valid untuk diedit");
}

/**
 * Get invoice with active version for a user.
 */
export async function getInvoice(userId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId },
    include: {
      template: true,
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan");
  }

  return invoice;
}

/**
 * List all invoices for a user.
 */
export async function listInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    include: {
      template: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
