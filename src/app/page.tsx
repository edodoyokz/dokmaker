import Link from "next/link";
import { 
  FileText, 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  Download, 
  Zap 
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />

      {/* Navigation Header */}
      <header className="border-b border-zinc-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              DokMaker
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Masuk
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-medium px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-100 transition-all shadow-md"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="h-3 w-3" /> PWA Mobile-First & Instan
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight md:leading-none">
          Buat Invoice Premium & Profesional{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            dalam Hitungan Detik
          </span>
        </h1>
        <p className="mt-6 text-zinc-400 max-w-2xl mx-auto text-base md:text-lg">
          Solusi invoice pintar untuk freelancer dan kreator independen. Draft gratis, preview ber-watermark gratis, dan bayar hanya saat Anda siap men-download PDF final.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link 
            href="/register" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
          >
            Mulai Sekarang <ArrowRight className="h-4 w-4" />
          </Link>
          <Link 
            href="#pricing" 
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-200 font-medium transition-all"
          >
            Lihat Harga
          </Link>
        </div>

        {/* Feature Badges for Freelancers */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
            <Smartphone className="h-6 w-6 text-indigo-400 mb-2" />
            <h3 className="font-semibold text-zinc-200">Mobile-First PWA</h3>
            <p className="text-xs text-zinc-500 mt-1">Buat invoice langsung dari smartphone, di mana saja.</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
            <Zap className="h-6 w-6 text-purple-400 mb-2" />
            <h3 className="font-semibold text-zinc-200">Instan & Mudah</h3>
            <p className="text-xs text-zinc-500 mt-1">Pilih template, isi data, dan invoice Anda langsung siap.</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
            <Wallet className="h-6 w-6 text-pink-400 mb-2" />
            <h3 className="font-semibold text-zinc-200">Deposit Dompet</h3>
            <p className="text-xs text-zinc-500 mt-1">Top up saldo dengan mudah via Pakasir Payment Gateway.</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
            <ShieldCheck className="h-6 w-6 text-emerald-400 mb-2" />
            <h3 className="font-semibold text-zinc-200">Aman & Terlindungi</h3>
            <p className="text-xs text-zinc-500 mt-1">File PDF tersimpan aman dan diunduh menggunakan signed URL.</p>
          </div>
        </div>
      </section>

      {/* Interactive Mockup section */}
      <section className="max-w-5xl mx-auto px-6 pb-24 relative z-10">
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-md shadow-2xl shadow-indigo-500/5 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/80 mb-4">
            <div className="h-3 w-3 rounded-full bg-rose-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs text-zinc-500 ml-2 font-mono">dokmaker.app/dashboard</span>
          </div>
          <div className="aspect-[16/9] w-full bg-zinc-950 rounded-lg border border-zinc-900 flex flex-col justify-center items-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <FileText className="h-12 w-12 text-zinc-700 mx-auto animate-bounce" />
              <h4 className="text-lg font-bold text-zinc-300">Editor Invoice Responsif</h4>
              <p className="text-sm text-zinc-500">
                Formulir modular yang otomatis menghitung total, PPN, dan menyusun tata letak PDF secara presisi untuk kenyamanan klien Anda.
              </p>
              <div className="inline-flex gap-2 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
                Rp10.000 / Download • Unpaid Version Edit = New Snapshot
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight">Skema Harga yang Transparan</h2>
          <p className="mt-4 text-zinc-400">
            Tanpa biaya bulanan atau komitmen jangka panjang. Bayar hanya ketika Anda mengunduh dokumen versi final yang siap dikirim.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          {/* Card 1: Draft & Preview */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-300">Draft & Preview</h3>
              <p className="mt-2 text-sm text-zinc-500">Desain dan sesuaikan invoice sesuka hati Anda tanpa biaya.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-zinc-100">Rp 0</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Buat draf tak terbatas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Preview ber-watermark di browser</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Akses template platform aktif</span>
                </li>
              </ul>
            </div>
            <Link 
              href="/register" 
              className="mt-8 w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-center text-sm font-medium text-zinc-300 transition-colors"
            >
              Mulai Gratis
            </Link>
          </div>

          {/* Card 2: Premium Download */}
          <div className="p-8 rounded-3xl bg-zinc-900/60 border-2 border-indigo-500/80 flex flex-col justify-between relative shadow-xl shadow-indigo-500/5">
            <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-bold tracking-wider uppercase text-white shadow-md">
              Terpopuler
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-200">Download PDF Final</h3>
              <p className="mt-2 text-sm text-zinc-400">Unduh invoice resmi berformat PDF bersih tanpa watermark.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">Rp 10.000</span>
                <span className="text-xs text-zinc-500">/ versi invoice</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Format PDF kualitas cetak tinggi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Bebas watermark & pelindung copy</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span><strong>Download ulang gratis</strong> untuk versi yang sama</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Penyimpanan aman di cloud</span>
                </li>
              </ul>
            </div>
            <Link 
              href="/register" 
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-center text-sm font-semibold text-white transition-all shadow-md shadow-indigo-500/10"
            >
              Coba Sekarang
            </Link>
          </div>

          {/* Card 3: Top Up Packages */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-300">Top Up Saldo Dompet</h3>
              <p className="mt-2 text-sm text-zinc-500">Isi saldo akun Anda untuk download instan kapan saja.</p>
              <div className="mt-6 flex flex-col gap-2">
                <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-400">Paket Hemat</span>
                  <span className="text-sm font-bold text-zinc-200">Rp 50.000</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-400">Paket Premium</span>
                  <span className="text-sm font-bold text-zinc-200">Rp 100.000</span>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                  <span>Top up instan via <strong>Pakasir</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                  <span>Dukung QRIS, Virtual Account, dll</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                  <span>Saldo tidak hangus / kadaluarsa</span>
                </li>
              </ul>
            </div>
            <Link 
              href="/register" 
              className="mt-8 w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-center text-sm font-medium text-zinc-300 transition-colors"
            >
              Isi Saldo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 relative z-10 text-center text-zinc-500 text-xs">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="font-bold text-sm text-zinc-300">DokMaker</span>
          </div>
          <p>© {new Date().getFullYear()} DokMaker. Hak Cipta Dilindungi Undang-Undang. Integrasi Pembayaran oleh Pakasir.</p>
        </div>
      </footer>
    </div>
  );
}
