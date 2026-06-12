"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  FileSpreadsheet, 
  AlertCircle, 
  FileText,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [senderName, setSenderName] = useState("");
  const [clientName, setClientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () =>
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);

  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const updateItem = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) {
      setError("Template ID tidak ditemukan. Harap pilih template terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          content: {
            sender: { name: senderName },
            client: { name: clientName },
            meta: {
              invoiceNumber,
              issueDate,
              currency: "IDR",
            },
            items: items.filter((item) => item.description),
            notes,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat invoice");
      }

      router.push("/app/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/app/templates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Katalog Template
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Buat Invoice Baru <Plus className="h-5 w-5 text-indigo-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Lengkapi draf invoice di bawah ini. Invoice yang Anda buat akan disimpan sebagai versi draf.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sender Card */}
        <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
            <User className="h-4.5 w-4.5 text-indigo-400" />
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Informasi Pengirim</h2>
          </div>
          <CardContent className="p-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nama Pengirim / Bisnis</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
                placeholder="e.g. John Doe, CV Digital Solusi"
                className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Card */}
        <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
            <Users className="h-4.5 w-4.5 text-purple-400" />
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Informasi Klien</h2>
          </div>
          <CardContent className="p-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nama Klien / Perusahaan</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                placeholder="e.g. PT Sukses Makmur"
                className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
            <Calendar className="h-4.5 w-4.5 text-pink-400" />
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Detail Dokumen</h2>
          </div>
          <CardContent className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nomor Invoice</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                  placeholder="e.g. INV-2026-001"
                  className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tanggal Terbit</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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
              <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Daftar Item & Jasa</h2>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus className="h-4 w-4" /> Tambah Item
            </button>
          </div>
          
          <CardContent className="p-5">
            {/* Header Row on Desktop */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 mb-2 px-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <div className="col-span-6">Deskripsi Layanan</div>
              <div className="col-span-2 text-center">Jumlah</div>
              <div className="col-span-3">Harga Satuan (Rp)</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-4 sm:space-y-2.5">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col sm:grid sm:grid-cols-12 gap-3.5 sm:gap-3 p-4 sm:p-0 rounded-xl sm:rounded-none bg-zinc-950/40 sm:bg-transparent border border-zinc-800/60 sm:border-0 relative">
                  {/* Description */}
                  <div className="col-span-6 space-y-1 sm:space-y-0">
                    <label className="block sm:hidden text-[10px] font-semibold text-zinc-500 uppercase">Deskripsi</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      required
                      placeholder="e.g. Jasa Pembuatan Website, Desain Logo"
                      className="block w-full rounded-xl sm:rounded-lg bg-zinc-950 border border-zinc-800 sm:border-zinc-850 px-3.5 sm:px-3 py-2.5 sm:py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2 space-y-1 sm:space-y-0">
                    <label className="block sm:hidden text-[10px] font-semibold text-zinc-500 uppercase">Jumlah</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", Number(e.target.value))
                      }
                      min={1}
                      required
                      className="block w-full rounded-xl sm:rounded-lg bg-zinc-950 border border-zinc-800 sm:border-zinc-850 px-3.5 sm:px-3 py-2.5 sm:py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center transition-all"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-3 space-y-1 sm:space-y-0">
                    <label className="block sm:hidden text-[10px] font-semibold text-zinc-500 uppercase">Harga Satuan</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, "unitPrice", Number(e.target.value))
                      }
                      min={0}
                      required
                      className="block w-full rounded-xl sm:rounded-lg bg-zinc-950 border border-zinc-800 sm:border-zinc-850 px-3.5 sm:px-3 py-2.5 sm:py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-1 flex items-center justify-end sm:justify-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 sm:p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                        title="Hapus Item"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Summary Display */}
            <div className="mt-6 border-t border-zinc-800/80 pt-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Ketentuan Harga</p>
                <p className="text-xs text-zinc-400 mt-0.5">Automated Calculation (IDR)</p>
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
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Catatan Tambahan</h2>
          </div>
          <CardContent className="p-5">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Pembayaran paling lambat 14 hari setelah invoice diterima. Transfer ke rekening Bank BCA 1234567 a.n John Doe."
              className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
            <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300 font-semibold">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
        >
          <Save className="h-4.5 w-4.5" /> {loading ? "Menyimpan..." : "Simpan & Buat Draf"}
        </button>
      </form>
    </div>
  );
}
