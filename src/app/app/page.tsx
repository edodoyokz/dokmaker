import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AppDashboard() {
  const user = await requireUser();

  const [wallet, recentInvoices, recentTransactions] =
    await Promise.all([
      prisma.wallet.findUnique({ where: { userId: user.id } }),
      prisma.invoice.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          template: { select: { name: true } },
          versions: {
            orderBy: { versionNumber: "desc" as const },
            take: 1,
            select: { status: true, versionNumber: true },
          },
        },
      }),
      prisma.walletLedgerEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const balance = wallet?.currentBalance ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Balance Card */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Saldo</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            Rp{balance.toLocaleString("id-ID")}
          </p>
          {balance < 10000 && (
            <Link
              href="/app/wallet/topup"
              className="mt-2 inline-block text-xs text-blue-600 hover:underline"
            >
              Top up untuk download invoice
            </Link>
          )}
        </div>

        {/* Invoice Count */}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Total Invoice</p>
          <p className="mt-1 text-2xl font-bold">{recentInvoices.length}</p>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border bg-white p-4 sm:col-span-2">
          <p className="mb-2 text-sm text-gray-500">Aksi Cepat</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/templates"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              + Buat Invoice
            </Link>
            <Link
              href="/app/wallet/topup"
              className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              Top Up Saldo
            </Link>
            <Link
              href="/app/invoices"
              className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              Lihat Semua Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="mb-6 rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Invoice Terbaru</h2>
          <Link
            href="/app/invoices"
            className="text-sm text-blue-600 hover:underline"
          >
            Lihat Semua
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Belum ada invoice.</p>
            <Link
              href="/app/templates"
              className="mt-2 inline-block text-blue-600 hover:underline"
            >
              Buat invoice pertama Anda
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {recentInvoices.map((invoice) => {
              const latestVersion = invoice.versions[0];
              return (
                <Link
                  key={invoice.id}
                  href={`/app/invoices/${invoice.id}/edit`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">
                      {invoice.template.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        latestVersion?.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {latestVersion?.status === "paid"
                        ? "Sudah Bayar"
                        : "Belum Bayar"}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">
                      v{latestVersion?.versionNumber}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Transaksi Terbaru</h2>
          <Link
            href="/app/wallet"
            className="text-sm text-blue-600 hover:underline"
          >
            Lihat Semua
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Belum ada transaksi.</p>
            <Link
              href="/app/wallet/topup"
              className="mt-2 inline-block text-blue-600 hover:underline"
            >
              Top up saldo pertama Anda
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {recentTransactions.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">
                    {entry.entryType === "topup_credit"
                      ? "Top Up"
                      : entry.entryType === "download_debit"
                      ? "Download Invoice"
                      : entry.entryType === "refund_credit"
                      ? "Refund"
                      : entry.entryType === "manual_adjustment_credit"
                      ? "Penyesuaian (+)"
                      : entry.entryType === "manual_adjustment_debit"
                      ? "Penyesuaian (-)"
                      : entry.entryType}
                  </p>
                  {entry.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {entry.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      entry.entryType.includes("credit")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {entry.entryType.includes("credit") ? "+" : "-"}Rp
                    {entry.amount.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
