"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

      router.refresh();
      router.push(`/app/invoices/${invoiceId}/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 pb-12">
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
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300 font-semibold">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
      >
        <Save className="h-4.5 w-4.5" />
        {loading ? "Menyimpan Perubahan..." : "Simpan Perubahan & Lanjut ke Preview"}
      </button>
    </form>
  );
}
