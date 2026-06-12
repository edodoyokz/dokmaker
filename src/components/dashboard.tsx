"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        return <Badge variant="default">Lunas</Badge>;
      case "unpaid":
        return <Badge variant="secondary">Belum Bayar</Badge>;
      case "processing_payment":
        return <Badge variant="outline">Diproses</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {user.fullName || user.email}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(wallet.currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum untuk download: Rp10.000
            </p>
            <Link href="/app/wallet/topup" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              Top Up
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              Total invoice
            </p>
            <Link href="/app/invoices/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
              Buat Invoice
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link href="/app/templates" className={cn(buttonVariants({ variant: "outline" }))}>
              Lihat Template
            </Link>
            <Link href="/app/invoices/new" className={cn(buttonVariants({ variant: "outline" }))}>
              Buat Invoice
            </Link>
            <Link href="/app/wallet" className={cn(buttonVariants({ variant: "outline" }))}>
              Lihat Saldo
            </Link>
            <Link href="/app/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
              Invoice Saya
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-muted-foreground">Belum ada invoice</p>
          ) : (
            <div className="space-y-4">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.clientName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invoice.status)}
                    <Link
                      href={`/app/invoices/${invoice.id}/preview`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      Lihat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground">Belum ada transaksi</p>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <span
                    className={`font-medium ${
                      tx.entryType.includes("credit")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {tx.entryType.includes("credit") ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
