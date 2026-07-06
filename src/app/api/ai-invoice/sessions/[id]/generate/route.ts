import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { generateAiInvoiceOutput } from "@/modules/ai-invoice/service";
import { AI_INVOICE_IMAGE_MODELS } from "@/modules/ai-invoice/constants";
import { safeApiError } from "@/lib/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const fieldEdits = Array.isArray(body.fieldEdits)
      ? body.fieldEdits
          .map((e: { label?: unknown; from?: unknown; to?: unknown }) => ({
            label: String(e.label ?? ""),
            from: String(e.from ?? ""),
            to: String(e.to ?? ""),
          }))
          .filter((e: { label: string; to: string }) => e.label && e.to)
      : [];
    const rawModel = typeof body.model === "string" ? body.model : "";
    const model = (AI_INVOICE_IMAGE_MODELS as readonly string[]).includes(rawModel) ? rawModel : undefined;
    const output = await generateAiInvoiceOutput(user.id, id, {
      fieldEdits,
      instruction: String(body.instruction || ""),
      disclaimerAccepted: body.disclaimerAccepted === true,
      idempotencyKey: String(body.idempotencyKey || ""),
      model,
    });
    return NextResponse.json(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Saldo tidak mencukupi") ? 402 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
