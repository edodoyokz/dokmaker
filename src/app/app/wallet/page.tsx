import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  History 
} from "lucide-react";

export default async function WalletPage() {
  const authUser = await requireUser();

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
        return "Download Invoice Final";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Dompet Digital <Wallet className="h-5 w-5 text-indigo-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pantau saldo dan riwayat pengeluaran cetak invoice Anda.
          </p>
        </div>
        <Link 
          href="/app/wallet/topup" 
          className={cn(buttonVariants(), "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 rounded-xl shadow-md")}
        >
          <Plus className="mr-2 h-4 w-4" /> Top Up Saldo
        </Link>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950 via-zinc-950 to-purple-950 p-6 md:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="absolute top-[-30%] right-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Saldo Tersedia</span>
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {formatCurrency(user.wallet.currentBalance)}
            </div>
          </div>
          <Wallet className="h-8 w-8 text-indigo-400 opacity-80" />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800/80 pt-6">
          <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
            Setiap unduhan versi invoice final berharga <strong className="text-zinc-200">Rp10.000</strong>. Anda dapat mengunduh ulang versi yang sama secara gratis kapan pun dibutuhkan.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono self-start sm:self-auto">
            Currency: IDR
          </div>
        </div>
      </div>

      {/* Ledger History */}
      <Card className="border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md rounded-2xl shadow-md overflow-hidden">
        <CardHeader className="py-4 border-b border-zinc-800/60 flex flex-row items-center gap-2">
          <History className="h-4 w-4 text-purple-400" />
          <CardTitle className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Riwayat Transaksi</CardTitle>
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
