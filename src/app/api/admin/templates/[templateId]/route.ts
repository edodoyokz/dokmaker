import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { templateId } = await params;
    const body = await request.json();
    const { status } = body;

    if (status && !["active", "inactive"].includes(status)) {
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 }
      );
    }

    const template = await prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: { status },
    });

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "update_template_status",
        targetType: "invoice_template",
        targetId: templateId,
        detail: { status },
      },
    });

    return NextResponse.json(template);
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
