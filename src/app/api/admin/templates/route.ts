import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import { adminTemplatePayloadSchema } from "@/lib/validation/admin-template.schema";
import { writeAuditLog } from "@/modules/audit";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const parseResult = adminTemplatePayloadSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Payload template tidak valid" },
        { status: 400 }
      );
    }

    const { name, description, htmlTemplate } = parseResult.data;

    const template = await prisma.invoiceTemplate.create({
      data: {
        name,
        description: description || null,
        htmlTemplate,
        price: 10000,
        status: "active",
      },
    });

    // Audit log
    await writeAuditLog(prisma, {
      adminUserId: admin.id,
      action: "create_template",
      targetType: "invoice_template",
      targetId: template.id,
      detail: { name },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
