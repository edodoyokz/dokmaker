import { prisma } from "@/lib/db/prisma";
import {
  invoiceContentSchema,
  type InvoiceContent,
} from "./invoice-content.schema";
import { hashInvoiceContent } from "./content-hash";
import { Prisma } from "@prisma/client";

/**
 * Create a new invoice draft from a template.
 * Creates version 1 (unpaid) and sets it as active.
 */
export async function createInvoice(
  userId: string,
  templateId: string,
  content: InvoiceContent
) {
  // Validate content
  const validated = invoiceContentSchema.parse(content);

  // Verify template exists and is active
  const template = await prisma.invoiceTemplate.findUnique({
    where: { id: templateId, status: "active" },
  });

  if (!template) {
    throw new Error("Template tidak ditemukan atau tidak aktif");
  }

  // Create invoice with first version in a transaction
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        userId,
        templateId,
        invoiceNumber: validated.meta.invoiceNumber,
        status: "draft",
      },
    });

    const version = await tx.invoiceVersion.create({
      data: {
        invoiceId: invoice.id,
        versionNumber: 1,
        status: "unpaid",
        contentSnapshot: validated as unknown as Prisma.InputJsonValue,
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
 * Edit an invoice. Handles versioning rules:
 * - Unpaid active version: overwrite content
 * - Paid active version: create new unpaid version
 */
export async function editInvoice(
  userId: string,
  invoiceId: string,
  content: InvoiceContent
) {
  const validated = invoiceContentSchema.parse(content);

  // Verify ownership
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId },
    include: {
      versions: {
        where: { id: undefined },
        take: 0,
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan");
  }

  if (!invoice.activeVersionId) {
    throw new Error("Invoice tidak memiliki versi aktif");
  }

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
        contentSnapshot: validated as unknown as Prisma.InputJsonValue,
        contentHash: hashInvoiceContent(validated),
      },
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
          contentSnapshot: validated as unknown as Prisma.InputJsonValue,
          contentHash: hashInvoiceContent(validated),
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { activeVersionId: newVersion.id },
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
