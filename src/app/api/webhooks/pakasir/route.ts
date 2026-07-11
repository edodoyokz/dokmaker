import { NextResponse } from "next/server";
import { handlePakasirWebhook } from "@/modules/payments/pakasir";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { safeApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // Rate limit by IP for webhooks
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = `webhook:${ip}`;
    const rateLimitResponse = await checkRateLimit(rateLimitKey, RATE_LIMITS.WEBHOOK);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    // Validate required fields (body.status is optional — Pakasir may not include it;
    // the actual status is verified via the Pakasir Transaction Detail API inside
    // handlePakasirWebhook).
    if (
      !body.project ||
      !body.order_id ||
      body.amount === undefined ||
      body.amount === null
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await handlePakasirWebhook(body);
    return NextResponse.json(result);
  } catch (error) {
    // Log full error server-side; return a generic message to the caller so
    // internal validation details (slug/amount/order_id checks) cannot be used
    // as a reconnaissance oracle to forge webhooks.
    logger.error(
      "webhook",
      "Pakasir webhook processing failed",
      {
        message: error instanceof Error ? error.message : "Unknown webhook error",
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
    return NextResponse.json(
      { error: safeApiError(error) },
      { status: 400 }
    );
  }
}
