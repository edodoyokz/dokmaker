import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { getAiInvoiceSession } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await getAiInvoiceSession(user.id, id));
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
