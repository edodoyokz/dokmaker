import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { FINAL_DOWNLOAD_PRICE } from "@/modules/pricing/constants";
import { debitWallet } from "@/modules/wallet/service";
import { generateInvoicePdf } from "@/lib/pdf/generator";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

/**
 * Process final PDF download.
 * Handles paid/unpaid version logic and wallet debit.
 */
export async function processDownload(
  userId: string,
  invoiceId: string
): Promise<{ pdf: Buffer; filename: string }> {
  // Get invoice with ownership check
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId },
    include: {
      versions: {
        where: { id: undefined },
        take: 0,
      },
    },
  });

  if (!invoice || !invoice.activeVersionId) {
    logger.warn("download", "Invoice not found for download", { invoiceId }, userId);
    throw new Error("Invoice tidak ditemukan");
  }

  const activeVersion = await prisma.invoiceVersion.findUnique({
    where: { id: invoice.activeVersionId },
  });

  if (!activeVersion) {
    throw new Error("Versi aktif tidak ditemukan");
  }

  const content = activeVersion.contentSnapshot as unknown as InvoiceContent;

  // If already paid, return free re-download
  if (activeVersion.status === "paid") {
    logger.download("Free re-download", { invoiceId, versionId: activeVersion.id }, userId);
    const pdf = await generateInvoicePdf(content);

    // Log re-download
    await prisma.downloadLog.create({
      data: {
        userId,
        invoiceVersionId: activeVersion.id,
        wasPaidDownload: false,
        amount: 0,
      },
    });

    return {
      pdf,
      filename: `invoice-${invoice.invoiceNumber}-v${activeVersion.versionNumber}.pdf`,
    };
  }

  // If unpaid, claim the version first, then charge exactly once.
  if (activeVersion.status === "unpaid") {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error("Wallet tidak ditemukan");
    }

    if (wallet.currentBalance < FINAL_DOWNLOAD_PRICE) {
      logger.warn("download", "Insufficient balance", { required: FINAL_DOWNLOAD_PRICE, available: wallet.currentBalance }, userId);
      throw new Error(
        `Saldo tidak mencukupi. Diperlukan Rp${FINAL_DOWNLOAD_PRICE.toLocaleString("id-ID")}`
      );
    }

    const claim = await prisma.invoiceVersion.updateMany({
      where: { id: activeVersion.id, status: "unpaid" },
      data: { status: "processing_payment" },
    });

    if (claim.count !== 1) {
      throw new Error("Download invoice sedang diproses atau sudah dibayar");
    }

    logger.download("Paid download initiated", { invoiceId, versionId: activeVersion.id, amount: FINAL_DOWNLOAD_PRICE }, userId);

    let pdf: Buffer;
    try {
      // Generate PDF before charging. If generation fails, no wallet debit is created.
      pdf = await generateInvoicePdf(content);
    } catch (error) {
      await prisma.invoiceVersion.update({
        where: { id: activeVersion.id },
        data: { status: "generation_failed" },
      });
      throw error;
    }

    // Debit wallet and mark as paid in atomic transaction.
    await prisma.$transaction(async (tx) => {
      await debitWallet(
        tx,
        userId,
        FINAL_DOWNLOAD_PRICE,
        "download_debit",
        `download:${invoiceId}:${activeVersion.versionNumber}`,
        "invoice_version",
        activeVersion.id,
        `Download invoice ${invoice.invoiceNumber} v${activeVersion.versionNumber}`,
        "user",
        userId
      );

      await tx.invoiceVersion.update({
        where: { id: activeVersion.id },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      });

      await tx.downloadLog.create({
        data: {
          userId,
          invoiceVersionId: activeVersion.id,
          wasPaidDownload: true,
          amount: FINAL_DOWNLOAD_PRICE,
        },
      });
    });

    return {
      pdf,
      filename: `invoice-${invoice.invoiceNumber}-v${activeVersion.versionNumber}.pdf`,
    };
  }

  throw new Error("Status versi tidak valid");
}
