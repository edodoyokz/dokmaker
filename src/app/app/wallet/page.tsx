import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { TopupPendingBanner } from "@/components/wallet/topup-pending-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle, 
  CheckCircle2, 
  History 
} from "lucide-react";

export default async function WalletPage({
  searchParams,
}: {
  searchParams?: Promise<{ topup?: string }>;
}) {
  const authUser = await requireUser();
  const params = (await searchParams) || {};
  const topupPending = params.topup === "pending";

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { wallet: true },
  });

  if (!user || !user.wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
        <p className="font-semibold text-zinc-300">Pengguna tidak ditemukan</p>
      </div>
    );
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
        return "Top Up Saldo";
      case "download_debit":
        return "Unduh PDF final";
      case "ai_generation_debit":
        return "Generate Invoice AI";
      case "admin_credit":
        return "Penyesuaian Admin (+)";
      case "admin_debit":
        return "Penyesuaian Admin (-)";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Sukses
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
            <AlertCircle className="h-3 w-3" /> Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
            <AlertCircle className="h-3 w-3" /> Gagal
          </span>
        );
      default:
        return (
          <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {topupPending && <TopupPendingBanner />}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Dompet
          </h1>
          <p className="text-sm text-zinc-400">
            Saldo dan riwayat unduhan PDF final.
          </p>
        </div>
        <Link
          href="/app/wallet/topup"
          className={cn(
            buttonVariants(),
            "shrink-0 rounded-lg border-0 bg-indigo-600 text-white hover:bg-indigo-500"
          )}
        >
          <Plus className="mr-2 h-4 w-4" /> Top up
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">Saldo tersedia</p>
            <p className="text-3xl font-semibold tracking-tight text-zinc-50">
              {formatCurrency(user.wallet.currentBalance)}
            </p>
            <p className="text-xs text-zinc-500">
              Rp10.000 / versi PDF final · unduh ulang versi sama gratis
            </p>
          </div>
          <Wallet className="h-6 w-6 shrink-0 text-zinc-500" />
        </div>
      </div>

      <Card className="overflow-hidden rounded-xl border-zinc-800 bg-zinc-900">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-zinc-800 py-3">
          <History className="h-4 w-4 text-zinc-400" />
          <CardTitle className="text-sm font-semibold text-zinc-200">
            Riwayat transaksi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledgerEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
              <History className="h-8 w-8 text-zinc-700 mb-2" />
              <p className="text-sm font-semibold">Belum Ada Transaksi</p>
              <p className="text-xs text-zinc-600 mt-1">Status pengeluaran akun Anda akan tercatat di sini.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {ledgerEntries.map((entry) => {
                const isCredit = entry.entryType.includes("credit");
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 hover:bg-zinc-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                        isCredit ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {isCredit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-200">
                          {getEntryTypeLabel(entry.entryType)}
                        </p>
                        {entry.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {entry.description}
                          </p>
                        )}
                        <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                          {new Date(entry.createdAt).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <p className={cn(
                        "font-extrabold text-sm tracking-tight",
                        isCredit ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {isCredit ? "+" : "-"} {formatCurrency(entry.amount)}
                      </p>
                      <div>
                        {getStatusBadge(entry.status)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
