import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AppDashboard() {
  const user = await requireUser();

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  const invoiceCount = await prisma.invoice.count({
    where: { userId: user.id },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Balance Card */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Saldo</p>
          <p className="mt-1 text-2xl font-bold">
            Rp{(wallet?.currentBalance ?? 0).toLocaleString("id-ID")}
          </p>
        </div>

        {/* Invoice Count Card */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Total Invoice</p>
          <p className="mt-1 text-2xl font-bold">{invoiceCount}</p>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Aksi Cepat</p>
          <div className="mt-2 flex gap-2">
            <Link
              href="/app/templates"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Buat Invoice
            </Link>
            <Link
              href="/app/wallet"
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
            >
              Top Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
