import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { createInvoice } from "@/modules/invoices/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { templateId, content } = body;

    if (!templateId || !content) {
      return NextResponse.json(
        { error: "Template ID dan content wajib diisi" },
        { status: 400 }
      );
    }

    const result = await createInvoice(user.id, templateId, content);
    return NextResponse.json(result, { status: 201 });
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
