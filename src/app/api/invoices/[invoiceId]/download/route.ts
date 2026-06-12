import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { processDownload } from "@/modules/downloads/service";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await requireUser();

    // Rate limit check
    const rateLimitKey = getRateLimitKey(request, user.id, "download");
    const rateLimitResponse = checkRateLimit(
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
      error.message.includes("Saldo tidak mencukupi")
    ) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
