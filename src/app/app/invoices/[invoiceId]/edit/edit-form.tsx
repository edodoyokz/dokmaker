"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  invoiceId: string;
  initialContent: {
    senderName: string;
    clientName: string;
    invoiceNumber: string;
    issueDate: string;
    items: { description: string; quantity: number; unitPrice: number }[];
    notes: string;
  };
}

export default function InvoiceEditForm({
  invoiceId,
  initialContent,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [senderName, setSenderName] = useState(initialContent.senderName);
  const [clientName, setClientName] = useState(initialContent.clientName);
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialContent.invoiceNumber
  );
  const [issueDate, setIssueDate] = useState(initialContent.issueDate);
  const [notes, setNotes] = useState(initialContent.notes);
  const [items, setItems] = useState(initialContent.items);

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
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        throw new Error(data.error || "Gagal menyimpan perubahan");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Pengirim</h2>
        <input
          type="text"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Klien</h2>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Detail</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            required
            className="rounded-md border px-3 py-2"
          />
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
            className="rounded-md border px-3 py-2"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Item</h2>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateItem(index, "description", e.target.value)
                }
                required
                className="flex-1 rounded-md border px-3 py-2"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, "quantity", Number(e.target.value))
                }
                min={1}
                required
                className="w-20 rounded-md border px-3 py-2"
              />
              <input
                type="number"
                value={item.unitPrice}
                onChange={(e) =>
                  updateItem(index, "unitPrice", Number(e.target.value))
                }
                min={0}
                required
                className="w-32 rounded-md border px-3 py-2"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="px-2 text-red-500"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          + Tambah Item
        </button>
        <div className="mt-3 border-t pt-3 text-right">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-bold">
            Rp{total.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Catatan</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </form>
  );
}
