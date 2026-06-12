import Link from "next/link";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AdminTemplatesPage() {
  await requireAdmin();

  const templates = await prisma.invoiceTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kelola Template</h1>
        <Link
          href="/admin/templates/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Template Baru
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="p-4">Nama</th>
              <th className="p-4">Harga</th>
              <th className="p-4">Status</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id} className="border-b last:border-0">
                <td className="p-4 font-medium">{template.name}</td>
                <td className="p-4">
                  Rp{template.price.toLocaleString("id-ID")}
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      template.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {template.status === "active" ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="p-4">
                  <Link
                    href={`/admin/templates/${template.id}/edit`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Belum ada template.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
