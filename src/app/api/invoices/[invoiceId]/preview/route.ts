import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  gocarReceiptContentSchema,
} from "@/modules/documents/gocar-receipt-content.schema";
import { generateGoCarReceiptPdf } from "@/modules/documents/gocar-receipt-pdf";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { safeApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Watermarked draft preview for document types that render via PDF stamp
 * (currently gocar_receipt). Does not debit wallet and never returns a clean
 * final PDF.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await requireUser();
    const rateLimitResponse = await checkRateLimit(
      getRateLimitKey(request, user.id, "preview"),
      RATE_LIMITS.PREVIEW
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { invoiceId } = await params;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id },
      include: {
        versions: {
          where: {},
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!invoice || !invoice.activeVersionId) {
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
    }

    const active = invoice.versions.find((v) => v.id === invoice.activeVersionId);
    if (!active) {
      return NextResponse.json({ error: "Versi aktif tidak ditemukan" }, { status: 404 });
    }

    if (invoice.documentType !== "gocar_receipt") {
      return NextResponse.json(
        { error: "Preview PDF stamp hanya tersedia untuk GoCar receipt" },
        { status: 400 }
      );
    }

    const content = gocarReceiptContentSchema.parse(active.contentSnapshot);
    const pdf = await generateGoCarReceiptPdf(content, {
      watermark: {
        email: user.email,
        timestamp: new Date(active.createdAt).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        versionId: active.id,
      },
    });

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="gocar-preview.pdf"',
        "Cache-Control": "no-store, must-revalidate",
        "X-Dokmaker-Preview": "watermarked",
        // Same-origin iframe on the draft preview page (overrides clickjacking DENY).
        "Content-Security-Policy":
          "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error(
      "invoice",
      "Preview PDF failed",
      error instanceof Error ? { message: error.message } : undefined
    );
    return NextResponse.json({ error: safeApiError(error) }, { status: 500 });
  }
}
