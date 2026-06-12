"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
}

export default function AdminAdjustmentForm({ userId }: Props) {
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/users/${userId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal melakukan penyesuaian");
      }

      setSuccess(true);
      setAmount("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("credit")}
          className={`flex-1 rounded-md px-3 py-2 text-sm ${
            type === "credit"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Tambah (+)
        </button>
        <button
          type="button"
          onClick={() => setType("debit")}
          className={`flex-1 rounded-md px-3 py-2 text-sm ${
            type === "debit"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Kurang (-)
        </button>
      </div>
      <input
        type="number"
        placeholder="Amount (Rp)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        min={1}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <textarea
        placeholder="Alasan penyesuaian (wajib)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        rows={2}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">Penyesuaian berhasil!</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Simpan Penyesuaian"}
      </button>
    </form>
  );
}
