import { NextResponse } from "next/server";
import { handlePakasirWebhook } from "@/modules/payments/pakasir";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
    if (!body.project || !body.order_id || !body.amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await handlePakasirWebhook(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Pakasir webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 400 }
    );
  }
}
