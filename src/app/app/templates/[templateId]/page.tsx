import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireUser();
  const { templateId } = await params;

  const template = await prisma.invoiceTemplate.findUnique({
    where: { id: templateId, status: "active" },
  });

  if (!template) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/app/templates"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Kembali ke Template
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex h-48 items-center justify-center rounded bg-gray-100">
          <span className="text-gray-400">Preview Template</span>
        </div>

        <h1 className="text-2xl font-bold">{template.name}</h1>
        {template.description && (
          <p className="mt-2 text-gray-600">{template.description}</p>
        )}
        <p className="mt-4 text-lg font-semibold text-blue-600">
          Harga: Rp{template.price.toLocaleString("id-ID")} per invoice
        </p>

        <Link
          href={`/app/invoices/new?templateId=${template.id}`}
          className="mt-6 inline-block rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Gunakan Template Ini
        </Link>
      </div>
    </div>
  );
}
