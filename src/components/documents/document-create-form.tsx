"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Sparkles, AlertCircle } from "lucide-react";
import type { DocumentType } from "@/modules/documents/types";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import type { GoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";
import { InvoiceFormFields } from "./invoice-form-fields";
import { GoCarReceiptFormFields } from "./gocar-receipt-form-fields";

interface DocumentCreateFormProps {
  templateId: string;
  templateName: string;
  documentType: DocumentType;
  defaultContent: InvoiceContent | GoCarReceiptContent;
}

export function DocumentCreateForm({
  templateId,
  templateName,
  documentType,
  defaultContent,
}: DocumentCreateFormProps) {
  const router = useRouter();
  const [content, setContent] = useState<InvoiceContent | GoCarReceiptContent>(
    defaultContent
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInvoice = documentType === "invoice";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payloadContent = isInvoice
        ? {
            ...(content as InvoiceContent),
            items: (content as InvoiceContent).items.filter(
              (item) => item.description
            ),
          }
        : content;

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          content: payloadContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat dokumen");
      }

      const data = (await res.json()) as {
        invoice?: { id?: string };
        id?: string;
      };
      const invoiceId = data.invoice?.id || data.id;
      if (!invoiceId) throw new Error("Respons server tidak valid");

      toast.success("Draf disimpan — membuka pratinjau");
      router.push(`/app/invoices/${invoiceId}/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28 lg:pb-12">
      <div>
        <Link
          href="/app/templates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Katalog Template
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          {isInvoice ? "Buat invoice" : "Buat GoCar receipt"}
          {isInvoice ? (
            <Plus className="h-5 w-5 text-indigo-400" />
          ) : (
            <Sparkles className="h-5 w-5 text-emerald-400" />
          )}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Template: <span className="text-zinc-300 font-medium">{templateName}</span>
          . Lengkapi draf di bawah ini. Dokumen akan disimpan sebagai versi draf.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isInvoice ? (
          <InvoiceFormFields
            content={content as InvoiceContent}
            onChange={setContent}
            disabled={loading}
          />
        ) : (
          <GoCarReceiptFormFields
            content={content as GoCarReceiptContent}
            onChange={setContent}
            disabled={loading}
          />
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-xs font-semibold text-rose-300">{error}</p>
          </div>
        )}

        <div className="hidden lg:block">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Menyimpan…" : "Simpan & pratinjau"}
          </button>
        </div>

        {/* Mobile sticky save — bottom nav is hidden on this route. */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur-md lg:hidden">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Menyimpan…" : "Simpan & pratinjau"}
          </button>
        </div>
      </form>
    </div>
  );
}
