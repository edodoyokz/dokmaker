"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InvoicePreview from "@/components/invoices/invoice-preview";
import { 
  ArrowLeft, 
  Download, 
  CreditCard, 
  Sparkles, 
  Edit3, 
  AlertCircle,
  Wallet
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  initialStatus: string;
  initialBalance: number;
  content: {
    sender: { name: string; address?: string; email?: string };
    client: { name: string; address?: string; email?: string };
    meta: { invoiceNumber: string; issueDate: string; dueDate?: string; currency: string };
    items: { description: string; quantity: number; unitPrice: number }[];
    notes?: string;
    paymentInstruction?: string;
  };
  previewMeta: {
    email: string;
    timestamp: string;
    versionId: string;
  };
}

export default function PreviewClient({
  invoiceId,
  invoiceNumber,
  initialStatus,
  initialBalance,
  content,
  previewMeta,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [balance, setBalance] = useState(initialBalance);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`);

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error("Saldo tidak mencukupi untuk melakukan cetak invoice.");
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengunduh invoice final");
      }

      // Convert response to blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Successfully processed download
      if (status !== "paid") {
        setStatus("paid");
        setBalance((prev) => Math.max(0, prev - 10000));
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat cetak PDF");
    } finally {
      setDownloading(false);
    }
  };

  const isPaid = status === "paid";
  const hasInsufficientBalance = balance < 10000;

  return (
    <div className="space-y-6 pb-12">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Invoice
        </Link>
      </div>

      {/* Title block */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Workspace Invoice <Sparkles className="h-5 w-5 text-indigo-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Lakukan pratinjau watermark draft di bawah ini sebelum mencetak file PDF final Anda.
        </p>
      </div>

      {/* Main Grid Workbench */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Side: Watermarked Document View */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 md:p-6 overflow-x-auto shadow-2xl relative">
            <div className="absolute top-2 left-2 z-10">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-[9px] font-semibold text-zinc-400 backdrop-blur-sm">
                Document Draft Preview
              </span>
            </div>
            
            <div className="min-w-[600px] border border-zinc-900 rounded-lg overflow-hidden bg-white">
              <InvoicePreview
                content={content}
                isPreview={!isPaid}
                previewMeta={previewMeta}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Control & Checkout Widget */}
        <div className="lg:col-span-4 space-y-4">
          {/* Status Details */}
          <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-zinc-800/60 bg-zinc-900/10">
              <h2 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Detail Status Cetak</h2>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Nomor Invoice</span>
                <span className="text-xs font-bold text-zinc-200">{invoiceNumber}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Status Invoice</span>
                <div>
                  {isPaid ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs">
                      Lunas
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs">
                      Belum Bayar
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Harga Cetak</span>
                <span className="text-xs font-extrabold text-zinc-200">Rp10.000</span>
              </div>

              <div className="border-t border-zinc-800/80 pt-4 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-zinc-400">Saldo Dompet</span>
                </div>
                <span className="text-xs font-bold text-zinc-200">
                  {formatCurrency(balance)}
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-rose-300 font-semibold leading-normal">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {isPaid ? (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/15 transition-all disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" /> {downloading ? "Mengunduh..." : "Download PDF Clean (Free)"}
                  </button>
                ) : hasInsufficientBalance ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-2">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400 leading-normal">
                        Saldo Dompet Anda tidak cukup untuk membayar biaya cetak. Harap isi saldo terlebih dahulu.
                      </p>
                    </div>
                    <Link
                      href="/app/wallet/topup"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-xs font-bold text-white shadow-md transition-all"
                    >
                      <CreditCard className="h-4 w-4" /> Top Up Saldo Sekarang
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/15 transition-all disabled:opacity-50"
                  >
                    <CreditCard className="h-4 w-4" /> {downloading ? "Memproses Cetak..." : "Beli & Download PDF (Rp10.000)"}
                  </button>
                )}

                <Link
                  href={`/app/invoices/${invoiceId}/edit`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-350 hover:text-zinc-100 transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Draf Invoice
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
