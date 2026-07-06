import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { generateAiInvoiceOutput } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const output = await generateAiInvoiceOutput(user.id, id, {
      instruction: String(body.instruction || ""),
      disclaimerAccepted: body.disclaimerAccepted === true,
      idempotencyKey: String(body.idempotencyKey || ""),
    });
    return NextResponse.json(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Saldo tidak mencukupi") ? 402 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
