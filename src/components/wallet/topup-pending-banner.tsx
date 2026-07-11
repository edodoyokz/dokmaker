"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** After Pakasir redirect: poll soft-refresh until webhook credits wallet. */
export function TopupPendingBanner() {
  const router = useRouter();
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    // ~10 refreshes over ~30s; webhook usually lands sooner.
    if (ticks >= 10) return;
    const id = window.setTimeout(() => {
      setTicks((t) => t + 1);
      router.refresh();
    }, 3000);
    return () => window.clearTimeout(id);
  }, [ticks, router]);

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-3">
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-indigo-400" />
      <div className="min-w-0 text-[12px] leading-relaxed text-indigo-100/90">
        <p className="font-semibold text-indigo-200">
          Pembayaran sedang dikonfirmasi
        </p>
        <p className="mt-0.5 text-indigo-100/70">
          Saldo biasanya masuk dalam beberapa detik setelah bayar sukses. Halaman
          ini diperbarui otomatis — tidak perlu top up ulang.
        </p>
      </div>
    </div>
  );
}
