import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { createTopUpPayment } from "@/modules/payments/pakasir";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // Rate limit check
    const rateLimitKey = getRateLimitKey(request, user.id, "topup");
    const rateLimitResponse = checkRateLimit(rateLimitKey, RATE_LIMITS.TOP_UP);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
