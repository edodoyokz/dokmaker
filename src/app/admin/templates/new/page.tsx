"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTemplatePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [htmlTemplate, setHtmlTemplate] = useState(`<div class="invoice">
  {{preview.watermark}}
  <h1>INVOICE {{invoice.number}}</h1>
  <p>Tanggal: {{invoice.issueDate}}</p>
  <p>Dari: {{sender.name}}</p>
  <p>Untuk: {{client.name}}</p>
  <table>
    <thead><tr><th>Deskripsi</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
    <tbody>
      {{#items}}
      <tr><td>{{description}}</td><td>{{quantity}}</td><td>{{unitPrice}}</td><td>{{subtotal}}</td></tr>
      {{/items}}
    </tbody>
  </table>
  <p>Total: {{total}}</p>
  <p>{{notes}}</p>
  <p>{{paymentInstruction}}</p>
  {{preview.meta}}
</div>`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, htmlTemplate }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat template");
      }

      router.push("/admin/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/templates"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Kembali
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Template Baru</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nama Template
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Deskripsi
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            HTML Template
          </label>
          <textarea
            value={htmlTemplate}
            onChange={(e) => setHtmlTemplate(e.target.value)}
            rows={10}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            Placeholder yang tersedia:{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{invoice.number}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{invoice.issueDate}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{invoice.dueDate}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{invoice.currency}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{sender.name}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{sender.address}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{sender.email}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{sender.phone}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{client.name}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{client.address}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{client.email}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{client.phone}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{total}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{notes}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{paymentInstruction}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{preview.watermark}}"}</code> (hanya preview),{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{preview.meta}}"}</code> (hanya preview).
            Blok item:{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{#items}}"}...{"{{/items}}"}</code>{" "}
            dengan{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{description}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{quantity}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{unitPrice}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{subtotal}}"}</code>.
            Gunakan system font (Arial, Georgia, Courier) dan inline <code className="bg-gray-100 px-1 rounded">&lt;style&gt;</code> di dalam template.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Template"}
        </button>
      </form>
    </div>
  );
}
