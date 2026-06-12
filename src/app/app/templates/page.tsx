import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function TemplatesPage() {
  await requireUser();

  const templates = await prisma.invoiceTemplate.findMany({
    where: { status: "active" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Template Invoice</h1>

      {templates.length === 0 ? (
        <p className="text-gray-500">Belum ada template tersedia.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/app/templates/${template.id}`}
              className="block rounded-lg border bg-white p-4 hover:shadow-md"
            >
              <div className="mb-3 flex h-32 items-center justify-center rounded bg-gray-100">
                <span className="text-gray-400">Preview</span>
              </div>
              <h2 className="font-semibold">{template.name}</h2>
              {template.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {template.description}
                </p>
              )}
              <p className="mt-2 text-sm font-medium text-blue-600">
                Rp{template.price.toLocaleString("id-ID")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
