import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function WalletPage() {
  const authUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { wallet: true },
  });

  if (!user || !user.wallet) {
    return <div>User not found</div>;
  }

  const ledgerEntries = await prisma.walletLedgerEntry.findMany({
    where: { walletId: user.wallet.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getEntryTypeLabel = (type: string) => {
    switch (type) {
      case "topup_credit":
        return "Top Up";
      case "download_debit":
        return "Download Invoice";
      case "admin_credit":
        return "Penyesuaian (+)";
      case "admin_debit":
        return "Penyesuaian (-)";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default">Berhasil</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Gagal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dompet</h1>
        <Link href="/app/wallet/topup" className={cn(buttonVariants())}>
          Top Up
        </Link>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Saat Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {formatCurrency(user.wallet.currentBalance)}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Minimum untuk download invoice: Rp10.000
          </p>
        </CardContent>
      </Card>

      {/* Ledger History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {ledgerEntries.length === 0 ? (
            <p className="text-muted-foreground">Belum ada transaksi</p>
          ) : (
            <div className="space-y-4">
              {ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">
                      {getEntryTypeLabel(entry.entryType)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        entry.entryType.includes("credit")
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {entry.entryType.includes("credit") ? "+" : "-"}
                      {formatCurrency(entry.amount)}
                    </p>
                    {getStatusBadge(entry.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
