"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

type Props = {
  invoiceId: string;
  /** Bumps when parent wants a hard reload (e.g. after edit). */
  reloadKey?: string | number;
};

type PageImage = { pageNumber: number; dataUrl: string; width: number; height: number };

/**
 * Draft preview for stamp-path documents: fetch watermarked PDF, rasterize
 * with PDF.js so the browser PDF chrome (download/print) never appears.
 */
export default function PdfStampPreview({ invoiceId, reloadKey = 0 }: Props) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPages([]);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/preview`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ||
            `Gagal memuat pratinjau (${res.status})`
        );
      }

      const buffer = await res.arrayBuffer();
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const doc = await pdfjs.getDocument({ data: buffer }).promise;
      const next: PageImage[] = [];

      // ~1.5× CSS px for sharp retina without huge payloads (2 pages A4).
      const RENDER_SCALE = 1.5;

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas tidak tersedia di browser ini");

        await page.render({ canvasContext: ctx, viewport }).promise;
        next.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL("image/jpeg", 0.92),
          width: viewport.width,
          height: viewport.height,
        });
      }

      setPages(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pratinjau");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey, tick]);

  if (loading) {
    return (
      <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-lg bg-zinc-50 px-4 py-16 text-sm text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <p className="font-medium">Menyiapkan pratinjau…</p>
        <p className="text-xs text-zinc-400">Draft berwatermark, bukan file final</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-lg bg-rose-50 px-6 py-16 text-center">
        <AlertCircle className="h-6 w-6 text-rose-500" />
        <p className="text-sm font-semibold text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[794px] flex-col gap-3 select-none">
      {pages.map((p) => (
        <figure
          key={p.pageNumber}
          className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rasterized PDF page data URL */}
          <img
            src={p.dataUrl}
            alt={`Halaman ${p.pageNumber} pratinjau dokumen`}
            width={p.width}
            height={p.height}
            draggable={false}
            className="block h-auto w-full"
            onContextMenu={(e) => e.preventDefault()}
          />
          <figcaption className="border-t border-zinc-100 bg-zinc-50 px-3 py-1 text-center text-[10px] font-medium text-zinc-400">
            Halaman {p.pageNumber} dari {pages.length} · draft berwatermark
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
