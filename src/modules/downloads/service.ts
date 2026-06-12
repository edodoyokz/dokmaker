import { prisma } from "@/lib/db/prisma";
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

  // If unpaid, check balance and charge
  if (activeVersion.status === "unpaid") {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error("Wallet tidak ditemukan");
    }

    if (wallet.currentBalance < FINAL_DOWNLOAD_PRICE) {
      throw new Error(
        `Saldo tidak mencukupi. Diperlukan Rp${FINAL_DOWNLOAD_PRICE.toLocaleString("id-ID")}`
      );
    }

    // Generate PDF first (before charging)
    const pdf = await generateInvoicePdf(content);

    // Debit wallet and mark as paid in atomic transaction
    await prisma.$transaction(async (tx) => {
      // Debit wallet
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

      // Mark version as paid
      await tx.invoiceVersion.update({
        where: { id: activeVersion.id },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      });

      // Create download log
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
