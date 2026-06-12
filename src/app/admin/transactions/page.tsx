import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AdminTransactionsPage() {
  await requireAdmin();

  const [ledgerEntries, payments] = await Promise.all([
    prisma.walletLedgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true } } },
    }),
    prisma.paymentTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Transaksi</h1>

      {/* Payments Section */}
      <div className="mb-8 rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Payment Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="p-3">User</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Order ID</th>
                <th className="p-3">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="p-3 text-sm">{payment.user.email}</td>
                  <td className="p-3">
                    Rp{payment.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        payment.status === "success"
                          ? "bg-green-100 text-green-700"
                          : payment.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm font-mono">
                    {payment.providerOrderId}
                  </td>
                  <td className="p-3 text-sm">
                    {new Date(payment.createdAt).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Belum ada transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger Section */}
      <div className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Wallet Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="p-3">User</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Description</th>
                <th className="p-3">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="p-3 text-sm">{entry.user.email}</td>
                  <td className="p-3 text-sm">{entry.entryType}</td>
                  <td className="p-3">
                    <span
                      className={
                        entry.entryType.includes("credit")
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {entry.entryType.includes("credit") ? "+" : "-"}Rp
                      {entry.amount.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{entry.description || "-"}</td>
                  <td className="p-3 text-sm">
                    {new Date(entry.createdAt).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
              {ledgerEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Belum ada ledger entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
