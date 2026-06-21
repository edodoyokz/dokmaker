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
    const rateLimitResponse = checkRateLimit(rateLimitKey, RATE_LIMITS.WEBHOOK);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    // Validate required fields
    if (
      !body.project ||
      !body.order_id ||
      body.amount === undefined ||
      body.amount === null ||
      !body.status
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await handlePakasirWebhook(body);
    return NextResponse.json(result);
  } catch (error) {
    // Log full error server-side; return generic message to webhook caller to
    // avoid leaking internal config (e.g. "Pakasir API key not configured").
    logger.error(
      "webhook",
      "Pakasir webhook processing failed",
      error instanceof Error ? { message: error.message } : undefined
    );
    return NextResponse.json(
      { error: safeApiError(error, "Webhook processing failed") },
      { status: 400 }
    );
  }
}
