import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { editInvoice } from "@/modules/invoices/service";
import { safeApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await requireUser();
    const { invoiceId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content wajib diisi" },
        { status: 400 }
      );
    }

    const result = await editInvoice(user.id, invoiceId, content);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error(
      "invoice",
      "Edit invoice failed",
      error instanceof Error ? { message: error.message } : undefined
    );
    return NextResponse.json(
      { error: safeApiError(error) },
      { status: 500 }
    );
  }
}
