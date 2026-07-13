"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TemplatePreview from "@/components/invoices/template-preview";
import {
  ArrowLeft,
  Download,
  CreditCard,
  Edit3,
  AlertCircle,
  Wallet,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FINAL_DOWNLOAD_PRICE } from "@/modules/pricing/constants";
import { getDocumentTypeDefinition } from "@/modules/documents/document-type-registry";

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  documentType: string;
  title?: string | null;
  versionNumber: number;
  initialStatus: string;
  initialBalance: number;
  content: unknown;
  htmlTemplate: string;
  previewMeta: {
    email: string;
    timestamp: string;
    versionId: string;
  };
}

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Deliver PDF blob on iOS when Share sheet is unavailable. */
function openPdfBlob(blob: Blob, pendingWindow: Window | null) {
  const url = window.URL.createObjectURL(blob);
  if (pendingWindow && !pendingWindow.closed) {
    pendingWindow.location.href = url;
  } else {
    const opened = window.open(url, "_blank");
    if (!opened) window.location.assign(url);
  }
  // Keep blob alive long enough for Safari to load the viewer.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
}

function documentLabel(documentType: string) {
  try {
    return getDocumentTypeDefinition(documentType).label;
  } catch {
    return "Dokumen";
  }
}

export default function PreviewClient({
  invoiceId,
  invoiceNumber,
  documentType,
  title,
  versionNumber,
  initialStatus,
  initialBalance,
  content,
  htmlTemplate,
  previewMeta,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [balance, setBalance] = useState(initialBalance);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = documentLabel(documentType);
  const displayTitle = title?.trim() || invoiceNumber;
  const isPaid = status === "paid";
  const hasInsufficientBalance = balance < FINAL_DOWNLOAD_PRICE;
  const priceLabel = formatIdr(FINAL_DOWNLOAD_PRICE);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    // iOS blocks window.open after await — reserve a tab during the user gesture.
    const isIos =
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const pendingWindow = isIos ? window.open("about:blank", "_blank") : null;

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`);

      if (!response.ok) {
        pendingWindow?.close();
        if (response.status === 402) {
          throw new Error(
            `Saldo tidak mencukupi. Diperlukan ${priceLabel} untuk cetak final.`
          );
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "Gagal mengunduh PDF final"
        );
      }

      const blob = await response.blob();
      const safeBase =
        displayTitle.replace(/[\/:*?"<>|\r\n]+/g, "").trim() || invoiceNumber;
      const filename = `${safeBase.slice(0, 80)}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });

      if (isIos) {
        const canShareFile =
          typeof navigator.share === "function" &&
          typeof File !== "undefined" &&
          (typeof navigator.canShare !== "function" ||
            navigator.canShare({ files: [file] }));

        if (canShareFile) {
          pendingWindow?.close();
          try {
            await navigator.share({
              files: [file],
              title: filename,
            });
            toast.success(
              isPaid
                ? "PDF final siap — simpan lewat Share sheet"
                : "Pembayaran berhasil — simpan PDF lewat Share sheet"
            );
          } catch (shareErr) {
            // User dismissed sheet or share failed — still surface the PDF.
            if (
              shareErr instanceof Error &&
              shareErr.name === "AbortError"
            ) {
              toast.message("Share dibatalkan — PDF tetap bisa diunduh ulang gratis");
            } else {
              openPdfBlob(blob, pendingWindow);
              toast.success(
                "PDF dibuka — tap Share → Simpan ke Files"
              );
            }
          }
        } else {
          openPdfBlob(blob, pendingWindow);
          toast.success(
            isPaid
              ? "PDF dibuka — tap Share → Simpan ke Files"
              : "Pembayaran berhasil — tap Share → Simpan ke Files"
          );
        }
      } else {
        pendingWindow?.close();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        toast.success(
          isPaid ? "PDF final diunduh" : "Pembayaran berhasil — PDF final diunduh"
        );
      }

      // Trust server as source of truth — no optimistic −Rp10.000 beyond first debit UI.
      if (status !== "paid") {
        setStatus("paid");
        setBalance((b) => Math.max(0, b - FINAL_DOWNLOAD_PRICE));
      }
      router.refresh();
    } catch (err) {
      pendingWindow?.close();
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat cetak PDF"
      );
    } finally {
      setDownloading(false);
    }
  };

  const cta = (() => {
    if (isPaid) {
      return (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/15 transition-all disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Mengunduh…" : "Unduh PDF final (gratis)"}
        </button>
      );
    }
    if (hasInsufficientBalance) {
      return (
        <div className="space-y-3">
          <div className="flex gap-2 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-[11px] leading-normal text-amber-400">
              Saldo kurang dari {priceLabel}. Isi saldo dulu untuk unduh PDF
              final tanpa watermark.
            </p>
          </div>
          <Link
            href="/app/wallet/topup"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-xs font-bold text-white shadow-md transition-all"
          >
            <CreditCard className="h-4 w-4" /> Top up saldo
          </Link>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/15 transition-all disabled:opacity-50"
      >
        <CreditCard className="h-4 w-4" />
        {downloading ? "Memproses…" : `Beli & unduh PDF (${priceLabel})`}
      </button>
    );
  })();

  return (
    // Bottom nav hidden on preview; only sticky buy bar needs clearance.
    <div className="space-y-4 pb-36 sm:space-y-6 lg:pb-12">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-indigo-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Daftar dokumen
        </Link>
        <Badge className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-zinc-300">
          {label}
        </Badge>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          Pratinjau {label}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {displayTitle}
          <span className="text-zinc-600"> · </span>
          versi {versionNumber}
        </p>
      </div>

      {/* Draft banner — always visible, honest about non-final. */}
      <div className="flex gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="min-w-0 text-[12px] leading-relaxed text-amber-100/90">
          <p className="font-semibold text-amber-200">
            Ini draft berwatermark — bukan file final
          </p>
          <p className="mt-0.5 text-amber-100/70">
            Pratinjau gratis. PDF bersih tanpa watermark diunduh setelah
            pembayaran {priceLabel} (versi yang sama bisa diunduh ulang gratis).
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-12">
        {/* Document surface — fits viewport width on mobile (no forced 794 scroll). */}
        <div className="lg:col-span-8">
          <div className="relative rounded-xl border border-zinc-900 bg-zinc-950 p-2 sm:p-3 md:p-4">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-medium text-zinc-500">
                Draft · watermark
              </span>
              <span className="truncate text-xs text-zinc-600">
                {previewMeta.email}
              </span>
            </div>
            <div className="max-w-full">
              <TemplatePreview
                invoiceId={invoiceId}
                htmlTemplate={htmlTemplate}
                documentType={documentType}
                content={content}
                previewMeta={previewMeta}
              />
            </div>
          </div>
        </div>

        {/* Checkout panel — desktop sidebar; mobile uses sticky bar below. */}
        <div className="hidden space-y-4 lg:sticky lg:top-24 lg:col-span-4 lg:block">
          <CheckoutCard
            invoiceNumber={invoiceNumber}
            isPaid={isPaid}
            balance={balance}
            priceLabel={priceLabel}
            error={error}
            cta={cta}
            invoiceId={invoiceId}
            editLabel={label}
          />
        </div>
      </div>

      {/* Mobile sticky checkout — full bottom (app nav hidden on this route). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 p-3 lg:hidden">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <Wallet className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
              {formatIdr(balance)}
            </span>
            <span className="shrink-0">
              {isPaid ? (
                <span className="font-semibold text-emerald-400">Lunas</span>
              ) : (
                <span className="font-semibold text-zinc-300">
                  Cetak {priceLabel}
                </span>
              )}
            </span>
          </div>
          {error && (
            <p className="text-[11px] font-medium leading-snug text-rose-400">
              {error}
            </p>
          )}
          {cta}
          <Link
            href={`/app/invoices/${invoiceId}/edit`}
            className="w-full py-1 text-center text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Edit draf {label}
          </Link>
        </div>
      </div>
    </div>
  );
}

function CheckoutCard({
  invoiceNumber,
  isPaid,
  balance,
  priceLabel,
  error,
  cta,
  invoiceId,
  editLabel,
}: {
  invoiceNumber: string;
  isPaid: boolean;
  balance: number;
  priceLabel: string;
  error: string | null;
  cta: ReactNode;
  invoiceId: string;
  editLabel: string;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-zinc-800 bg-zinc-900/30 shadow-lg">
      <div className="border-b border-zinc-800/60 bg-zinc-900/10 px-5 py-4">
        <h2 className="text-xs font-semibold text-zinc-400">
          Status cetak
        </h2>
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Nomor</span>
          <span className="text-xs font-bold text-zinc-200">{invoiceNumber}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Status</span>
          {isPaid ? (
            <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              Lunas
            </Badge>
          ) : (
            <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
              Belum bayar
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Harga cetak</span>
          <span className="text-xs font-semibold text-zinc-200">{priceLabel}</span>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-zinc-400">Saldo</span>
          </div>
          <span className="text-xs font-bold text-zinc-200">
            {formatIdr(balance)}
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-[11px] font-semibold leading-normal text-rose-300">
              {error}
            </p>
          </div>
        )}

        <div className="space-y-2 pt-1">
          {cta}
          <Link
            href={`/app/invoices/${invoiceId}/edit`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-100"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit draf {editLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
