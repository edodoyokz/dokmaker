"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Wallet, 
  FileText, 
  Plus, 
  Layers, 
  Eye, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Sparkles, 
  FilePlus2, 
  History 
} from "lucide-react";

interface DashboardProps {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
  };
  wallet: {
    currentBalance: number;
  };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    status: string;
    createdAt: string;
  }>;
  recentTransactions: Array<{
    id: string;
    entryType: string;
    amount: number;
    description: string | null;
    createdAt: string;
  }>;
}

export function Dashboard({ user, wallet, recentInvoices, recentTransactions }: DashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full text-xs">
            Lunas
          </Badge>
        );
      case "unpaid":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">
            Belum Bayar
          </Badge>
        );
      case "processing_payment":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 px-2 py-0.5 rounded-full text-xs animate-pulse">
            Diproses
          </Badge>
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
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Dashboard <Sparkles className="h-5 w-5 text-indigo-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Selamat datang kembali, <span className="font-semibold text-indigo-400">{user.fullName || user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/invoices/new"
            className={cn(buttonVariants({ size: "sm" }), "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/20")}
          >
            <Plus className="mr-2 h-4 w-4" /> Invoice Baru
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Wallet Debit Card Layout */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950 via-zinc-900 to-purple-950 p-6 text-white shadow-xl shadow-indigo-950/10">
          <div className="absolute top-[-20%] right-[-10%] w-[200px] h-[200px] rounded-full bg-indigo-500/10 blur-[50px] pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Saldo Dompet</span>
              <div className="text-3xl font-extrabold tracking-tight">
                {formatCurrency(wallet.currentBalance)}
              </div>
            </div>
            <Wallet className="h-7 w-7 text-indigo-400 opacity-80" />
          </div>

          <div className="mt-8 flex justify-between items-end">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Status Akun</p>
              <p className="text-xs font-semibold text-emerald-400">Aktif • Siap Download</p>
            </div>
            <Link 
              href="/app/wallet/topup" 
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Top Up Saldo
            </Link>
          </div>
        </div>

        {/* Invoice Stats Card */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Invoice Anda</span>
              <div className="text-3xl font-extrabold tracking-tight text-zinc-100">
                {recentInvoices.length}
              </div>
            </div>
            <FileText className="h-7 w-7 text-zinc-500" />
          </div>

          <div className="mt-8 flex justify-between items-end">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Invoice MVP</p>
              <p className="text-xs text-zinc-400">Rp10.000 / Final PDF</p>
            </div>
            <Link 
              href="/app/invoices" 
              className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-medium text-xs transition-all"
            >
              Kelola Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <Card className="border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-md">
        <CardHeader className="py-4 border-b border-zinc-800/60 bg-zinc-900/10">
          <CardTitle className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link 
              href="/app/templates" 
              className="group p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-indigo-500/50 hover:bg-indigo-950/10 text-center transition-all flex flex-col items-center gap-2"
            >
              <Layers className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-zinc-300 group-hover:text-indigo-300 transition-colors">Lihat Template</span>
            </Link>
            
            <Link 
              href="/app/invoices/new" 
              className="group p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-purple-500/50 hover:bg-purple-950/10 text-center transition-all flex flex-col items-center gap-2"
            >
              <FilePlus2 className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-zinc-300 group-hover:text-purple-300 transition-colors">Buat Invoice</span>
            </Link>

            <Link 
              href="/app/wallet" 
              className="group p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-pink-500/50 hover:bg-pink-950/10 text-center transition-all flex flex-col items-center gap-2"
            >
              <CreditCard className="h-5 w-5 text-pink-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-zinc-300 group-hover:text-pink-300 transition-colors">Informasi Saldo</span>
            </Link>

            <Link 
              href="/app/invoices" 
              className="group p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-emerald-500/50 hover:bg-emerald-950/10 text-center transition-all flex flex-col items-center gap-2"
            >
              <FileText className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-zinc-300 group-hover:text-emerald-300 transition-colors">Riwayat Invoice</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main Lists Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Invoices Card */}
        <Card className="border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md rounded-2xl shadow-md flex flex-col">
          <CardHeader className="py-4 border-b border-zinc-800/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" /> Invoice Terbaru
            </CardTitle>
            <Link href="/app/invoices" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Lihat Semua
            </Link>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <FileText className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-sm font-medium">Belum ada invoice dibuat</p>
                <Link href="/app/templates" className="mt-3 text-xs text-indigo-400 hover:underline">
                  Pilih template untuk memulai
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-800 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-sm text-zinc-200">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{invoice.clientName || "Draf Tanpa Nama"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(invoice.status)}
                      <Link
                        href={`/app/invoices/${invoice.id}/preview`}
                        className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 hover:border-zinc-700 transition-all shadow-sm"
                        title="Pratinjau"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions Card */}
        <Card className="border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md rounded-2xl shadow-md flex flex-col">
          <CardHeader className="py-4 border-b border-zinc-800/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-purple-400" /> Transaksi Terbaru
            </CardTitle>
            <Link href="/app/wallet" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
              Detail Dompet
            </Link>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <History className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-sm font-medium">Belum ada riwayat transaksi</p>
                <Link href="/app/wallet/topup" className="mt-3 text-xs text-purple-400 hover:underline">
                  Lakukan top up pertama Anda
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((tx) => {
                  const isCredit = tx.entryType.includes("credit");
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shadow-inner",
                          isCredit ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>
                          {isCredit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-zinc-200">{tx.description || (isCredit ? "Top Up Saldo" : "Download Invoice")}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-bold text-sm tracking-tight",
                        isCredit ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {isCredit ? "+" : "-"} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
