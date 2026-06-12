import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { getWallet, getLedgerEntries } from "@/modules/wallet/service";

export default async function WalletPage() {
  const user = await requireUser();
  const wallet = await getWallet(user.id);
  const entries = await getLedgerEntries(user.id, 20);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Wallet</h1>

      {/* Balance Card */}
      <div className="mb-6 rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Saldo Saat Ini</p>
        <p className="mt-1 text-3xl font-bold">
          Rp{wallet.currentBalance.toLocaleString("id-ID")}
        </p>
        <Link
          href="/app/wallet/topup"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Top Up
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Riwayat Transaksi</h2>
        </div>
        {entries.length === 0 ? (
          <p className="p-4 text-center text-gray-500">
            Belum ada transaksi.
          </p>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="flex justify-between p-4">
                <div>
                  <p className="font-medium">
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
                    <p className="text-sm text-gray-500">{entry.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      entry.entryType.includes("credit")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {entry.entryType.includes("credit") ? "+" : "-"}Rp
                    {entry.amount.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString("id-ID")}
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
