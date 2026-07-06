import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { createAiInvoiceSession } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File harus berupa gambar JPG, PNG, atau WebP" }, { status: 400 });
    }
    const session = await createAiInvoiceSession(user.id, file);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
