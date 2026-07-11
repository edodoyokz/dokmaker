import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { searchNominatimPlaces } from "@/modules/places/nominatim";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { safeApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const rateLimitResponse = await checkRateLimit(
      getRateLimitKey(request, user.id, "places"),
      RATE_LIMITS.PLACES
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    if (q.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchNominatimPlaces(q);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error(
      "invoice",
      "Place search failed",
      error instanceof Error ? { message: error.message } : undefined
    );
    return NextResponse.json(
      { error: safeApiError(error) },
      { status: 502 }
    );
  }
}
