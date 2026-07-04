import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { processDownload } from "@/modules/downloads/service";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { safeApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// PDF rendering via headless Chromium can take several seconds under load and
// in serverless cold starts. Give the route headroom on Vercel (Pro allows up
// to 300s) and force dynamic so the binary response is never statically cached.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await requireUser();

    // Rate limit check
    const rateLimitKey = getRateLimitKey(request, user.id, "download");
    const rateLimitResponse = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.DOWNLOAD
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { invoiceId } = await params;

    const { pdf, filename } = await processDownload(user.id, invoiceId);

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message.startsWith("Saldo tidak mencukupi")
    ) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    logger.error(
      "download",
      "Final PDF download failed",
      error instanceof Error ? { message: error.message } : undefined,
      undefined
    );
    return NextResponse.json(
      { error: safeApiError(error) },
      { status: 500 }
    );
  }
}
