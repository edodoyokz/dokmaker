import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AdminDashboard() {
  await requireAdmin();

  const [userCount, templateCount, invoiceCount, paymentCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.invoiceTemplate.count(),
      prisma.invoice.count(),
      prisma.paymentTransaction.count(),
    ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total User" value={userCount} />
        <StatCard label="Total Template" value={templateCount} />
        <StatCard label="Total Invoice" value={invoiceCount} />
        <StatCard label="Total Transaksi" value={paymentCount} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
