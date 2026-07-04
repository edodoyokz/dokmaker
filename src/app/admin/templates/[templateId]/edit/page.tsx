import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import EditTemplateClient from "./edit-client";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireAdmin();
  const { templateId } = await params;

  const template = await prisma.invoiceTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    notFound();
  }

  return <EditTemplateClient template={template} />;
}
