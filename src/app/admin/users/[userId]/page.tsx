import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import AdminAdjustmentForm from "./adjustment-form";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      paymentTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Detail User</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Info User</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Email:</span> {user.email}
            </p>
            <p>
              <span className="text-gray-500">Nama:</span>{" "}
              {user.fullName || "-"}
            </p>
            <p>
              <span className="text-gray-500">Role:</span> {user.role}
            </p>
            <p>
              <span className="text-gray-500">Saldo:</span> Rp
              {(user.wallet?.currentBalance ?? 0).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Admin Adjustment */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Penyesuaian Saldo</h2>
          <AdminAdjustmentForm userId={userId} />
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="mt-6 rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Invoice Terbaru</h2>
        </div>
        <div className="divide-y">
          {user.invoices.map((invoice) => (
            <div key={invoice.id} className="flex justify-between p-4">
              <div>
                <p className="font-medium">{invoice.invoiceNumber}</p>
                <p className="text-sm text-gray-500">{invoice.status}</p>
              </div>
              <p className="text-sm text-gray-400">
                {new Date(invoice.createdAt).toLocaleDateString("id-ID")}
              </p>
            </div>
          ))}
          {user.invoices.length === 0 && (
            <p className="p-4 text-center text-gray-500">Belum ada invoice.</p>
          )}
        </div>
      </div>
    </div>
  );
}
