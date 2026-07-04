import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { createTopUpPayment } from "@/modules/payments/pakasir";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { safeApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // Rate limit check
    const rateLimitKey = getRateLimitKey(request, user.id, "topup");
    const rateLimitResponse = await checkRateLimit(rateLimitKey, RATE_LIMITS.TOP_UP);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number") {
      return NextResponse.json(
        { error: "Amount wajib diisi" },
        { status: 400 }
      );
    }

    const result = await createTopUpPayment(user.id, amount);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error(
      "payment",
      "Top up payment creation failed",
      error instanceof Error ? { message: error.message } : undefined
    );
    return NextResponse.json(
      { error: safeApiError(error) },
      { status: 500 }
    );
  }
}
