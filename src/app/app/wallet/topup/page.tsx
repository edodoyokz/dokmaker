"use client";

import { useState } from "react";
import Link from "next/link";
import { ALLOWED_TOPUP_AMOUNTS } from "@/modules/pricing/constants";
import { 
  ArrowLeft, 
  Wallet, 
  CheckCircle2, 
  CreditCard, 
  ShieldCheck, 
  Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Back link */}
      <div>
        <Link
          href="/app/wallet"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Dompet
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Top Up Saldo <Wallet className="h-5 w-5 text-indigo-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Pilih paket isi saldo untuk mencetak PDF final tanpa watermark.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Package Options - 2 columns */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {ALLOWED_TOPUP_AMOUNTS.map((amount) => {
              const isSelected = selectedAmount === amount;
              const isPremium = amount === 100000;
              
              return (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`relative overflow-hidden rounded-2xl border text-left p-5 transition-all select-none flex flex-col justify-between h-[160px] ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/5"
                      : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/10"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <p className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                        {isPremium ? "Paket Premium" : "Paket Basic"}
                      </p>
                      <p className="text-2xl font-extrabold text-zinc-100 mt-1">
                        Rp{amount.toLocaleString("id-ID")}
                      </p>
                    </div>
                    
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase bg-zinc-800 text-zinc-400 border border-zinc-800">
                      {isPremium
                        ? "±10 unduhan final"
                        : "±5 unduhan final"}
                    </span>
                    <p className="mt-2 text-[10px] text-zinc-500">
                      Setara unduhan PDF final @ Rp10.000 / versi (versi sama
                      gratis diunduh ulang). Biaya AI terpisah bila dipakai.
                    </p>
                  </div>

                  {/* Highlights for Premium */}
                  {isPremium && (
                    <div className="absolute top-0 right-0 p-1.5 rounded-bl-lg bg-indigo-500 text-[8px] font-bold text-white uppercase tracking-wider">
                      Populer
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleTopUp}
            disabled={!selectedAmount || loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all disabled:opacity-50"
          >
            {loading ? "Memproses Checkout..." : "Bayar Aman dengan Pakasir"}
          </button>
        </div>

        {/* Info card - 1 column */}
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/20 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2.5">
                <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Pembayaran Terverifikasi</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Transaksi diproses secara real-time via gateway aman Pakasir.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <CreditCard className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Metode Pembayaran Lengkap</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Mendukung QRIS, Virtual Account bank lokal, e-wallet, dan gerai retail.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <Zap className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Kredit Saldo Instan</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Dompet digital Anda akan langsung terisi begitu pembayaran sukses dikonfirmasi.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
