import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { ALLOWED_TOPUP_AMOUNTS } from "@/modules/pricing/constants";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

/**
 * Body shape accepted by the Pakasir webhook endpoint. `providerEventId` is an
 * optional Pakasir-issued event id used for intake-level dedup; `signature` is
 * an optional HMAC the gateway may attach (verified only when a shared secret
 * is configured — graceful no-op otherwise, since Pakasir's signature support
 * is undocumented).
 */
export interface PakasirWebhookBody {
  project: string;
  order_id: string;
  amount: number;
  providerEventId?: string;
  signature?: string;
}

/**
 * Verify a Pakasir webhook HMAC signature. The signed payload is
 * `${order_id}:${amount}` and the signature is a hex SHA-256 digest, compared
 * in constant time to avoid timing oracles. Exported for testing.
 */
export function verifyPakasirSignature(
  secret: string,
  orderId: string,
  amount: number,
  signature: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}:${amount}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

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
export async function handlePakasirWebhook(body: PakasirWebhookBody) {
  const { project, order_id, amount, providerEventId, signature } = body;

  logger.webhook("Pakasir webhook received", { project, order_id, amount });

  // ── Defense in depth: optional HMAC signature ──────────────────────────
  // If a shared secret is configured, require and verify the signature so a
  // forged body (e.g. a replay with a tampered amount) is rejected before any
  // DB or upstream call. When no secret is configured we rely on the Pakasir
  // Transaction Detail API confirmation below.
  const webhookSecret = process.env.PAKASIR_WEBHOOK_SECRET;
  if (webhookSecret) {
    if (!signature) {
      throw new Error("Tanda tangan webhook hilang");
    }
    if (!verifyPakasirSignature(webhookSecret, order_id, amount, signature)) {
      throw new Error("Tanda tangan webhook tidak valid");
    }
  }

  // ── Intake-level dedup by provider event id ────────────────────────────
  // The same-order_id dedup is already handled below via payment.status and the
  // creditWallet idempotency key, but a second webhook carrying the same
  // providerEventId (even with a tampered body) is recorded as ignored_duplicate
  // and never reaches the credit path. Falls back to order_id when the gateway
  // omits an explicit event id.
  const eventId = providerEventId || order_id;
  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: "pakasir",
        providerEventId: eventId,
      },
    },
  });
  if (existingEvent && existingEvent.status === "processed") {
    logger.webhook("Duplicate webhook event ignored", { order_id, eventId });
    return { status: "ignored_duplicate" };
  }

  // Verify project slug
  if (project !== process.env.PAKASIR_PROJECT_SLUG) {
    throw new Error("Project slug tidak sesuai");
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

  // Check if Pakasir confirms payment
  if (detail.status !== "completed") {
    throw new Error("Transaksi belum completed di Pakasir");
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
        providerEventId: eventId,
        paymentTransactionId: payment.id,
        status: "processed",
        rawBody: body as unknown as Record<string, unknown> as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });
  });

  return { status: "credited" };
}
