"use client";

import { useMemo } from "react";
import {
  User,
  Users,
  Calendar,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import { calculateInvoiceTotal } from "@/modules/invoices/invoice-content.schema";

interface InvoiceFormFieldsProps {
  content: InvoiceContent;
  onChange: (content: InvoiceContent) => void;
  disabled?: boolean;
}

const inputClass =
  "block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all";

const labelClass =
  "block text-xs font-semibold text-zinc-400 uppercase tracking-wider";

export function InvoiceFormFields({
  content,
  onChange,
  disabled = false,
}: InvoiceFormFieldsProps) {
  const total = useMemo(() => calculateInvoiceTotal(content), [content]);

  const updateSender = (name: string) => {
    onChange({ ...content, sender: { ...content.sender, name } });
  };

  const updateClient = (name: string) => {
    onChange({ ...content, client: { ...content.client, name } });
  };

  const updateMeta = (meta: Partial<InvoiceContent["meta"]>) => {
    onChange({ ...content, meta: { ...content.meta, ...meta } });
  };

  const updateNotes = (notes: string) => {
    onChange({ ...content, notes });
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...content.items, { description: "", quantity: 1, unitPrice: 0 }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...content,
      items: content.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceContent["items"][number],
    value: string | number
  ) => {
    const updated = content.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...content, items: updated });
  };

  return (
    <div className="space-y-6">
      {/* Sender Card */}
      <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <User className="h-4.5 w-4.5 text-indigo-400" />
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
            Informasi Pengirim
          </h2>
        </div>
        <CardContent className="p-5">
          <div className="space-y-1.5">
            <label className={labelClass}>Nama Pengirim / Bisnis</label>
            <input
              type="text"
              value={content.sender.name}
              onChange={(e) => updateSender(e.target.value)}
              required
              disabled={disabled}
              placeholder="e.g. John Doe, CV Digital Solusi"
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* Client Card */}
      <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <Users className="h-4.5 w-4.5 text-purple-400" />
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
            Informasi Klien
          </h2>
        </div>
        <CardContent className="p-5">
          <div className="space-y-1.5">
            <label className={labelClass}>Nama Klien / Perusahaan</label>
            <input
              type="text"
              value={content.client.name}
              onChange={(e) => updateClient(e.target.value)}
              required
              disabled={disabled}
              placeholder="e.g. PT Sukses Makmur"
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* Details Card */}
      <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <Calendar className="h-4.5 w-4.5 text-pink-400" />
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
            Detail Dokumen
          </h2>
        </div>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClass}>Nomor Invoice</label>
              <input
                type="text"
                value={content.meta.invoiceNumber}
                onChange={(e) => updateMeta({ invoiceNumber: e.target.value })}
                required
                disabled={disabled}
                placeholder="e.g. INV-2026-001"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Tanggal Terbit</label>
              <input
                type="date"
                value={content.meta.issueDate}
                onChange={(e) => updateMeta({ issueDate: e.target.value })}
                required
                disabled={disabled}
                className={inputClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-400" />
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              Daftar Item & Jasa
            </h2>
          </div>
          <button
            type="button"
            onClick={addItem}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Tambah Item
          </button>
        </div>

        <CardContent className="p-5">
          <div className="hidden sm:grid sm:grid-cols-12 gap-3 mb-2 px-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            <div className="col-span-6">Deskripsi Layanan</div>
            <div className="col-span-2 text-center">Jumlah</div>
            <div className="col-span-3">Harga Satuan (Rp)</div>
            <div className="col-span-1"></div>
          </div>

          <div className="space-y-4 sm:space-y-2.5">
            {content.items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col sm:grid sm:grid-cols-12 gap-3.5 sm:gap-3 p-4 sm:p-0 rounded-xl sm:rounded-none bg-zinc-950/40 sm:bg-transparent border border-zinc-800/60 sm:border-0 relative"
              >
                <div className="col-span-6 space-y-1 sm:space-y-0">
                  <label className="block sm:hidden text-[10px] font-semibold text-zinc-500 uppercase">
                    Deskripsi
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    required
                    disabled={disabled}
                    placeholder="e.g. Jasa Pembuatan Website, Desain Logo"
                    className="block w-full rounded-xl sm:rounded-lg bg-zinc-950 border border-zinc-800 sm:border-zinc-850 px-3.5 sm:px-3 py-2.5 sm:py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="col-span-2 space-y-1 sm:space-y-0">
                  <label className="block sm:hidden text-[10px] font-semibold text-zinc-500 uppercase">
                    Jumlah
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", Number(e.target.value))
                    }
                    min={1}
                    required
                    disabled={disabled}
                    className="block w-full rounded-xl sm:rounded-lg bg-zinc-950 border border-zinc-800 sm:border-zinc-850 px-3.5 sm:px-3 py-2.5 sm:py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center transition-all"
                  />
                </div>

                <div className="col-span-3 space-y-1 sm:space-y-0">
                  <label className="block sm:hidden text-[10px] font-semibold text-zinc-500 uppercase">
                    Harga Satuan
                  </label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, "unitPrice", Number(e.target.value))
                    }
                    min={0}
                    required
                    disabled={disabled}
                    className="block w-full rounded-xl sm:rounded-lg bg-zinc-950 border border-zinc-800 sm:border-zinc-850 px-3.5 sm:px-3 py-2.5 sm:py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="col-span-1 flex items-center justify-end sm:justify-center">
                  {content.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={disabled}
                      className="p-2 sm:p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                      title="Hapus Item"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-zinc-800/80 pt-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                Ketentuan Harga
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automated Calculation (IDR)
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-500">Total Tagihan</p>
              <p className="text-2xl font-extrabold tracking-tight text-emerald-400 mt-0.5">
                Rp{total.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <FileText className="h-4.5 w-4.5 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
            Catatan Tambahan
          </h2>
        </div>
        <CardContent className="p-5">
          <textarea
            value={content.notes ?? ""}
            onChange={(e) => updateNotes(e.target.value)}
            rows={3}
            disabled={disabled}
            placeholder="e.g. Pembayaran paling lambat 14 hari setelah invoice diterima. Transfer ke rekening Bank BCA 1234567 a.n John Doe."
            className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </CardContent>
      </Card>
    </div>
  );
}
