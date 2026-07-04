import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import { adminTemplateUpdateSchema } from "@/lib/validation/admin-template.schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { templateId } = await params;
    const body = await request.json();

    const parseResult = adminTemplateUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Payload template tidak valid" },
        { status: 400 }
      );
    }

    const { name, description, htmlTemplate, price, status, documentType, sortOrder } = parseResult.data;

    // Build update data dynamically based on provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (htmlTemplate !== undefined) updateData.htmlTemplate = htmlTemplate;
    if (price !== undefined) updateData.price = price;
    if (status !== undefined) updateData.status = status;
    if (documentType !== undefined) updateData.documentType = documentType;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const template = await prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "update_template",
        targetType: "invoice_template",
        targetId: templateId,
        detail: { updatedFields: Object.keys(updateData) },
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
