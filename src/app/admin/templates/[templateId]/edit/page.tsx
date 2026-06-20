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

          <div>
            <p className="text-sm text-gray-500">HTML Template</p>
            <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 whitespace-pre-wrap">
              {template.htmlTemplate.substring(0, 2000)}
              {template.htmlTemplate.length > 2000 ? "\n..." : ""}
            </pre>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              Placeholder yang tersedia:{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{invoice.number}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{invoice.issueDate}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{invoice.dueDate}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{invoice.currency}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{sender.name}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{sender.address}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{sender.email}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{sender.phone}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{client.name}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{client.address}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{client.email}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{client.phone}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{total}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{notes}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{paymentInstruction}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{preview.watermark}}"}</code> (hanya preview),{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{preview.meta}}"}</code> (hanya preview).
              Blok item:{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{#items}}"}...{"{{/items}}"}</code>{" "}
              dengan{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{description}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{quantity}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{unitPrice}}"}</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">{"{{subtotal}}"}</code>.
              Gunakan system font dan inline <code className="bg-gray-100 px-1 rounded">&lt;style&gt;</code> di dalam template.
            </p>
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
