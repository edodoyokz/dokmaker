"use client";

import { useState } from "react";
import Link from "next/link";
import { ALLOWED_TOPUP_AMOUNTS } from "@/modules/pricing/constants";

export default function TopUpPage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopUp = async () => {
    if (!selectedAmount) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedAmount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat top up");
      }

      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/app/wallet"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Kembali ke Wallet
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Top Up Saldo</h1>

      <div className="max-w-md space-y-4">
        <div className="grid gap-3">
          {ALLOWED_TOPUP_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                selectedAmount === amount
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-lg font-bold">
                Rp{amount.toLocaleString("id-ID")}
              </p>
              <p className="text-sm text-gray-500">
                {amount === 50000 ? "Paket Basic" : "Paket Premium"}
              </p>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleTopUp}
          disabled={!selectedAmount || loading}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Bayar dengan Pakasir"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Anda akan diarahkan ke halaman pembayaran Pakasir
        </p>
      </div>
    </div>
  );
}
