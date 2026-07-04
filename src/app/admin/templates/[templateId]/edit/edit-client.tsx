"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ToggleTemplateButton from "./toggle-button";

type Template = {
  id: string;
  name: string;
  description: string | null;
  htmlTemplate: string;
  price: number;
  status: "active" | "inactive";
  documentType: string;
  sortOrder: number;
};

export default function EditTemplateClient({
  template,
}: {
  template: Template;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || "",
    htmlTemplate: template.htmlTemplate,
    price: template.price,
    sortOrder: template.sortOrder,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan template");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" || name === "sortOrder" ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Edit Template</h1>
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            template.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {template.status === "active" ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          Template berhasil disimpan!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="max-w-2xl rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Informasi Dasar</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Template
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urutan Tampilan
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Dokumen
              </label>
              <input
                type="text"
                value={template.documentType}
                disabled
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* HTML Template Editor */}
        <div className="max-w-4xl rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">HTML Template</h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
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
            Gunakan system font dan inline <code className="bg-gray-100 px-1 rounded">&lt;style&gt;</code> di dalam template.
          </p>

          {/* GoCar-specific placeholders */}
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Placeholder GoCar Receipt:{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{service.name}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{service.orderDate}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{service.orderId}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{customer.name}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{payment.totalPaid}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{payment.tripFee}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{payment.appFee}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{payment.appFeeDiscount}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{payment.total}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{payment.method}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.driverName}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.vehiclePlate}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.vehicleModel}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.distance}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.duration}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.pickupTime}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.pickupName}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.pickupAddress}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.dropoffTime}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.dropoffName}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{trip.dropoffAddress}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{issuer.companyName}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{issuer.npwp}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{issuer.address}}"}</code>.
          </p>

          <textarea
            name="htmlTemplate"
            value={formData.htmlTemplate}
            onChange={handleChange}
            required
            rows={20}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            spellCheck={false}
          />

          <p className="mt-2 text-xs text-gray-500">
            {formData.htmlTemplate.length.toLocaleString("id-ID")} karakter
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan Template"}
          </button>

          <ToggleTemplateButton
            templateId={template.id}
            currentStatus={template.status}
          />
        </div>
      </form>
    </div>
  );
}
