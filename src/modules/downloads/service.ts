import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { FINAL_DOWNLOAD_PRICE } from "@/modules/pricing/constants";
import { debitWallet } from "@/modules/wallet/service";
import { generateInvoicePdf } from "@/lib/pdf/generator";
import { pdfStorage, buildInvoiceFinalPdfStorageKey } from "./pdf-storage";
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
      template: true,
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

  const content = activeVersion.contentSnapshot as unknown;

  // If already paid, return free re-download
  if (activeVersion.status === "paid") {
    logger.download("Free re-download", { invoiceId, versionId: activeVersion.id }, userId);

    let pdf: Buffer;

    if (activeVersion.storageKey) {
      // Read from storage — immutable artifact, no regeneration needed
      pdf = await pdfStorage.get(activeVersion.storageKey);
    } else {
      // Legacy/migration path: artifact missing, regenerate once and persist
      logger.warn(
        "download",
        "Paid version missing storageKey, regenerating",
        { versionId: activeVersion.id },
        userId
      );
      pdf = await generateInvoicePdf(content, {
        template: {
          htmlTemplate: invoice.template.htmlTemplate,
          documentType: invoice.documentType,
        },
      });
      const recoveryKey = buildInvoiceFinalPdfStorageKey({
        userId,
        invoiceId: invoice.id,
        versionId: activeVersion.id,
        contentHash: activeVersion.contentHash,
      });
      await pdfStorage.put(recoveryKey, pdf);
      await prisma.invoiceVersion.update({
        where: { id: activeVersion.id },
        data: { storageKey: recoveryKey },
      });
    }

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
      filename: `${invoice.title || invoice.invoiceNumber || invoice.id}-v${activeVersion.versionNumber}.pdf`,
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

    // Track whether the financial transaction has started. Pre-debit failures
    // (PDF generation or storage upload) reset the version to unpaid so the
    // user can retry without being stranded in generation_failed.
    let debitTransactionStarted = false;

    let pdf: Buffer;
    try {
      // Generate PDF before charging. If generation fails, no wallet debit is created.
      pdf = await generateInvoicePdf(content, {
        template: {
          htmlTemplate: invoice.template.htmlTemplate,
          documentType: invoice.documentType,
        },
      });

      // Persist the generated PDF artifact BEFORE the financial transaction.
      // If storage fails, the catch below resets to unpaid without touching the wallet.
      const storageKey = buildInvoiceFinalPdfStorageKey({
        userId,
        invoiceId: invoice.id,
        versionId: activeVersion.id,
        contentHash: activeVersion.contentHash,
      });
      await pdfStorage.put(storageKey, pdf);

      // Debit wallet and mark as paid in atomic transaction.
      debitTransactionStarted = true;
      await prisma.$transaction(async (tx) => {
        await debitWallet(
          tx,
          userId,
          FINAL_DOWNLOAD_PRICE,
          "download_debit",
          `download:${invoiceId}:${activeVersion.versionNumber}`,
          "invoice_version",
          activeVersion.id,
          `Download invoice ${invoice.title || invoice.invoiceNumber} v${activeVersion.versionNumber}`,
          "user",
          userId
        );

        await tx.invoiceVersion.update({
          where: { id: activeVersion.id },
          data: {
            status: "paid",
            paidAt: new Date(),
            storageKey,
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
        filename: `${invoice.title || invoice.invoiceNumber || invoice.id}-v${activeVersion.versionNumber}.pdf`,
      };
    } catch (error) {
      // Only reset from processing_payment so we never overwrite a version that
      // a concurrent worker has already flipped to paid (or another state).
      // Pre-debit failures reset to unpaid for retry; post-debit failures are
      // rolled back by the Prisma transaction itself, so we leave the row in
      // processing_payment and flag generation_failed to avoid silent double charge.
      if (!debitTransactionStarted) {
        await prisma.invoiceVersion.updateMany({
          where: { id: activeVersion.id, status: "processing_payment" },
          data: { status: "unpaid" },
        });
      } else {
        await prisma.invoiceVersion.updateMany({
          where: { id: activeVersion.id, status: "processing_payment" },
          data: { status: "generation_failed" },
        });
      }
      throw error;
    }
  }

  throw new Error("Status versi tidak valid");
}
