"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
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
  FilePlus2,
  History,
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
    documentType?: string;
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

export function Dashboard({
  user,
  wallet,
  recentInvoices,
  recentTransactions,
}: DashboardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Dashboard"
        description={`Halo, ${user.fullName || user.email}`}
        action={
          <Link
            href="/app/templates"
            className={cn(buttonVariants({ size: "sm" }), "dm-cta h-9 px-3")}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Dokumen baru
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Saldo dompet</p>
              <p className="text-3xl font-semibold tracking-tight text-zinc-50">
                {formatCurrency(wallet.currentBalance)}
              </p>
              <p className="text-xs text-zinc-500">
                Rp10.000 / versi PDF final
              </p>
            </div>
            <Wallet className="h-6 w-6 text-zinc-500" />
          </div>
          <div className="mt-6">
            <Link
              href="/app/wallet/topup"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-indigo-600 text-white hover:bg-indigo-500"
              )}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Top up
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-zinc-400">Dokumen terbaru</p>
              <p className="text-3xl font-semibold tracking-tight text-zinc-50">
                {recentInvoices.length}
              </p>
              <p className="text-xs text-zinc-500">Di daftar singkat ini</p>
            </div>
            <FileText className="h-6 w-6 text-zinc-500" />
          </div>
          <div className="mt-6">
            <Link
              href="/app/invoices"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
              )}
            >
              Kelola dokumen
            </Link>
          </div>
        </div>
      </div>

      <Card className="rounded-xl border-zinc-800 bg-zinc-900">
        <CardHeader className="border-b border-zinc-800 py-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">
            Aksi cepat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                href: "/app/templates",
                icon: Layers,
                label: "Template",
              },
              {
                href: "/app/templates",
                icon: FilePlus2,
                label: "Buat dokumen",
              },
              {
                href: "/app/wallet",
                icon: CreditCard,
                label: "Saldo",
              },
              {
                href: "/app/invoices",
                icon: FileText,
                label: "Riwayat",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center transition-colors hover:border-zinc-600"
              >
                <item.icon className="h-5 w-5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col rounded-xl border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <FileText className="h-4 w-4 text-zinc-400" /> Dokumen
            </CardTitle>
            <Link
              href="/app/invoices"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Semua
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-4">
            {recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
                <FileText className="mb-2 h-8 w-8 text-zinc-700" />
                <p className="text-sm">Belum ada dokumen</p>
                <Link
                  href="/app/templates"
                  className="mt-2 text-xs text-indigo-400 hover:underline"
                >
                  Pilih template
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {invoice.clientName || "Tanpa nama"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={invoice.status} />
                      <Link
                        href={`/app/invoices/${invoice.id}/preview`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
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

        <Card className="flex flex-col rounded-xl border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <History className="h-4 w-4 text-zinc-400" /> Transaksi
            </CardTitle>
            <Link
              href="/app/wallet"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Dompet
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-4">
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
                <History className="mb-2 h-8 w-8 text-zinc-700" />
                <p className="text-sm">Belum ada transaksi</p>
                <Link
                  href="/app/wallet/topup"
                  className="mt-2 text-xs text-indigo-400 hover:underline"
                >
                  Top up pertama
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => {
                  const isCredit = tx.entryType.includes("credit");
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            isCredit
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          )}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200">
                            {tx.description ||
                              (isCredit ? "Top up" : "Unduh PDF")}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {new Date(tx.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold",
                          isCredit ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {isCredit ? "+" : "−"}
                        {formatCurrency(tx.amount)}
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
