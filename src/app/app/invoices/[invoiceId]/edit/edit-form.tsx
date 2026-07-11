"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, AlertCircle } from "lucide-react";
import { InvoiceFormFields } from "@/components/documents/invoice-form-fields";
import { GoCarReceiptFormFields } from "@/components/documents/gocar-receipt-form-fields";
import type { DocumentType } from "@/modules/documents/types";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import type { GoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";

interface Props {
  invoiceId: string;
  documentType: DocumentType;
  content: unknown;
}

function normalizeInvoiceContent(content: unknown): InvoiceContent {
  const c = content as InvoiceContent;
  return {
    sender: { ...c.sender, name: c.sender?.name ?? "" },
    client: { ...c.client, name: c.client?.name ?? "" },
    meta: {
      ...c.meta,
      invoiceNumber: c.meta?.invoiceNumber ?? "",
      issueDate: c.meta?.issueDate ?? "",
      currency: c.meta?.currency ?? "IDR",
    },
    items: c.items?.length
      ? c.items.map((item) => ({
          description: item.description ?? "",
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
        }))
      : [{ description: "", quantity: 1, unitPrice: 0 }],
    notes: c.notes ?? "",
    paymentInstruction: c.paymentInstruction ?? "",
    gocar: c.gocar,
  };
}

function normalizeGoCarContent(content: unknown): GoCarReceiptContent {
  const c = content as GoCarReceiptContent;
  return {
    service: {
      name: c.service?.name ?? "GoCar",
      orderDate: c.service?.orderDate ?? "",
      orderId: c.service?.orderId ?? "",
    },
    customer: {
      name: c.customer?.name ?? "",
    },
    payment: {
      totalPaid: c.payment?.totalPaid ?? 0,
      tripFee: c.payment?.tripFee ?? 0,
      appFee: c.payment?.appFee ?? 0,
      appFeeDiscount: c.payment?.appFeeDiscount ?? 0,
      method: c.payment?.method ?? "GoPay",
    },
    trip: {
      driverName: c.trip?.driverName ?? "",
      vehiclePlate: c.trip?.vehiclePlate ?? "",
      vehicleModel: c.trip?.vehicleModel ?? "",
      distance: c.trip?.distance ?? "",
      duration: c.trip?.duration ?? "",
      pickupTime: c.trip?.pickupTime ?? "",
      pickupName: c.trip?.pickupName ?? "",
      pickupAddress: c.trip?.pickupAddress ?? "",
      dropoffTime: c.trip?.dropoffTime ?? "",
      dropoffName: c.trip?.dropoffName ?? "",
      dropoffAddress: c.trip?.dropoffAddress ?? "",
    },
    issuer: {
      companyName: c.issuer?.companyName ?? "",
      npwp: c.issuer?.npwp ?? "",
      address: c.issuer?.address ?? "",
    },
  };
}

export default function InvoiceEditForm({
  invoiceId,
  documentType,
  content,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<InvoiceContent | GoCarReceiptContent>(
    documentType === "invoice"
      ? normalizeInvoiceContent(content)
      : normalizeGoCarContent(content)
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
            ...(draft as InvoiceContent),
            items: (draft as InvoiceContent).items.filter(
              (item) => item.description
            ),
          }
        : draft;

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: payloadContent }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan perubahan");
      }

      toast.success("Perubahan disimpan");
      router.refresh();
      router.push(`/app/invoices/${invoiceId}/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 pb-28 lg:pb-12">
      {isInvoice ? (
        <InvoiceFormFields
          content={draft as InvoiceContent}
          onChange={setDraft}
          disabled={loading}
        />
      ) : (
        <GoCarReceiptFormFields
          content={draft as GoCarReceiptContent}
          onChange={setDraft}
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
  );
}
