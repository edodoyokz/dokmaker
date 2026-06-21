import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { ALLOWED_TOPUP_AMOUNTS } from "@/modules/pricing/constants";
import { randomUUID } from "crypto";

/**
 * Create a payment transaction for top up.
 * Returns Pakasir payment URL.
 */
export async function createTopUpPayment(
  userId: string,
  amount: number
): Promise<{ paymentId: string; redirectUrl: string }> {
  // Validate amount
  if (!ALLOWED_TOPUP_AMOUNTS.includes(amount as 50000 | 100000)) {
    logger.warn("payment", "Invalid top up amount attempted", { amount }, userId);
    throw new Error(
      `Nominal top up tidak valid. Pilih Rp50.000 atau Rp100.000`
    );
  }

  const providerOrderId = `TOPUP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  logger.payment("Top up payment created", { amount, providerOrderId }, userId);
  const projectSlug = process.env.PAKASIR_PROJECT_SLUG;
  const baseUrl = process.env.PAKASIR_BASE_URL || "https://app.pakasir.com";

  if (!projectSlug) {
    throw new Error("Pakasir project slug not configured");
  }

  // Create payment transaction
  const payment = await prisma.paymentTransaction.create({
    data: {
      userId,
      provider: "pakasir",
      providerOrderId,
      amount,
      currency: "IDR",
      status: "created",
    },
  });

  // Build Pakasir payment URL
  const redirectUrl = `${baseUrl}/pay/${projectSlug}/${amount}?order_id=${providerOrderId}`;

  // Update payment with redirect URL
  await prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: { redirectUrl },
  });

  return {
    paymentId: payment.id,
    redirectUrl,
  };
}

/**
 * Handle Pakasir webhook.
 * Verifies and credits wallet if valid.
 */
export async function handlePakasirWebhook(body: {
  project: string;
  order_id: string;
  amount: number;
  status?: string;
  api_key?: string;
}) {
  const { project, order_id, amount, status } = body;

  logger.webhook("Pakasir webhook received", { project, order_id, amount, status });

  // Verify project slug
  if (project !== process.env.PAKASIR_PROJECT_SLUG) {
    throw new Error("Project slug tidak sesuai");
  }

  // Verify incoming webhook body status before any DB mutation.
  // This is a first-line filter; the authoritative check is the Transaction Detail API.
  if (status !== "completed") {
    throw new Error("Status webhook Pakasir belum completed");
  }

  // Find payment transaction
  const payment = await prisma.paymentTransaction.findFirst({
    where: {
      provider: "pakasir",
      providerOrderId: order_id,
    },
  });

  if (!payment) {
    throw new Error("Payment transaction tidak ditemukan");
  }

  // Check if already processed
  if (payment.status === "success") {
    logger.webhook("Webhook already processed", { order_id, paymentId: payment.id });
    return { status: "already_processed" };
  }

  // Verify amount
  if (payment.amount !== amount) {
    throw new Error("Amount tidak sesuai");
  }

  // Verify with Pakasir Transaction Detail API
  const apiKey = process.env.PAKASIR_API_KEY;
  if (!apiKey) {
    throw new Error("Pakasir API key not configured");
  }

  const detailResponse = await fetch(
    `${process.env.PAKASIR_BASE_URL || "https://app.pakasir.com"}/api/transactiondetail?project=${project}&order_id=${order_id}&api_key=${apiKey}`
  );

  if (!detailResponse.ok) {
    throw new Error("Gagal verifikasi transaksi dengan Pakasir");
  }

  const detail = await detailResponse.json();

  // Authoritative verification against Pakasir Transaction Detail API.
  // Never trust the webhook body alone; confirm status, project, order_id, and amount.
  if (detail.status !== "completed") {
    throw new Error("Transaksi belum completed di Pakasir");
  }

  if (detail.project !== project) {
    throw new Error("Project detail Pakasir tidak sesuai");
  }

  if (detail.order_id !== order_id) {
    throw new Error("Order ID detail Pakasir tidak sesuai");
  }

  if (Number(detail.amount) !== payment.amount) {
    throw new Error("Amount detail Pakasir tidak sesuai");
  }

  // Import wallet service
  const { creditWallet } = await import("@/modules/wallet/service");

  // Credit wallet in transaction
  await prisma.$transaction(async (tx) => {
    // Update payment status
    await tx.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        status: "success",
        paidAt: new Date(),
        providerReference: detail.reference || null,
      },
    });

    // Credit wallet
    await creditWallet(
      tx,
      payment.userId,
      amount,
      "topup_credit",
      `pakasir:${order_id}`,
      "payment_transaction",
      payment.id,
      `Top up via Pakasir: ${order_id}`,
      "webhook",
      "pakasir"
    );

    // Log webhook event
    await tx.paymentWebhookEvent.create({
      data: {
        provider: "pakasir",
        providerEventId: order_id,
        paymentTransactionId: payment.id,
        status: "processed",
        rawBody: body as unknown as Record<string, unknown> as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });
  });

  return { status: "credited" };
}
