import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import ToggleTemplateButton from "./toggle-button";

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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Template</h1>

      <div className="max-w-lg rounded-lg border bg-white p-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Nama</p>
            <p className="font-medium">{template.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Deskripsi</p>
            <p>{template.description || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Harga</p>
            <p>Rp{template.price.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                template.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {template.status === "active" ? "Aktif" : "Nonaktif"}
            </span>
          </div>

          <ToggleTemplateButton
            templateId={template.id}
            currentStatus={template.status}
          />
        </div>
      </div>
    </div>
  );
}
