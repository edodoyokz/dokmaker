import Link from "next/link";
import {
  FileText,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Download,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-zinc-50">
              DokMaker
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-indigo-400">
              Dokumen siap pakai · mobile-first
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-5xl sm:leading-tight">
              Buat invoice & receipt profesional, bayar hanya saat unduh PDF
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg">
              Pilih template platform, isi data, pratinjau gratis berwatermark.
              PDF final bersih seharga Rp10.000 per versi — unduh ulang versi
              yang sama gratis.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Mulai gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#harga"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-800 px-5 text-sm font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
              >
                Lihat harga
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Smartphone,
                title: "Mobile-first PWA",
                body: "Alur utama dirancang untuk layar HP 360px.",
              },
              {
                icon: Download,
                title: "Preview gratis",
                body: "Draf & pratinjau berwatermark tanpa potong saldo.",
              },
              {
                icon: Wallet,
                title: "Bayar per unduhan",
                body: "Isi dompet, unduh PDF final kapan saja.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <item.icon className="h-5 w-5 text-zinc-400" />
                <h2 className="mt-3 text-sm font-semibold text-zinc-100">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-zinc-900 bg-zinc-950">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Cara kerja
            </h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Empat langkah. Tanpa langganan bulanan.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "1",
                  t: "Pilih template",
                  d: "Invoice, GoCar receipt, dan template resmi lain.",
                },
                {
                  n: "2",
                  t: "Isi data",
                  d: "Form modular di HP. Simpan → langsung pratinjau.",
                },
                {
                  n: "3",
                  t: "Pratinjau",
                  d: "Draft berwatermark — jujur, bukan file final.",
                },
                {
                  n: "4",
                  t: "Unduh PDF",
                  d: "Potong saldo Rp10.000 / versi. Sama versi = gratis.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600/20 text-xs font-semibold text-indigo-300">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-zinc-100">
                    {step.t}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {step.d}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="harga" className="border-t border-zinc-900">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Harga transparan
            </h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Tidak ada biaya berlangganan. Bayar hanya saat butuh PDF final.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Draf & pratinjau
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Desain dan cek layout tanpa biaya.
                </p>
                <p className="mt-4 text-3xl font-semibold text-zinc-50">Rp0</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-400">
                  <Li>Draf tak terbatas</Li>
                  <Li>Preview berwatermark</Li>
                  <Li>Template platform aktif</Li>
                </ul>
                <Link
                  href="/register"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-700 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  Mulai gratis
                </Link>
              </div>

              <div className="relative flex flex-col rounded-xl border border-indigo-500/50 bg-zinc-900 p-5">
                <span className="absolute -top-2.5 right-4 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                  Utama
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">
                  PDF final
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  File bersih siap kirim ke klien.
                </p>
                <p className="mt-4 text-3xl font-semibold text-zinc-50">
                  Rp10.000
                  <span className="ml-1 text-sm font-normal text-zinc-500">
                    / versi
                  </span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-300">
                  <Li accent>PDF tanpa watermark</Li>
                  <Li accent>Unduh ulang versi sama gratis</Li>
                  <Li accent>Edit = versi baru (bayar lagi)</Li>
                  <Li accent>Penyimpanan aman, unduh terotorisasi</Li>
                </ul>
                <Link
                  href="/register"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Coba sekarang
                </Link>
              </div>

              <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Top up dompet
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Isi saldo via Pakasir (QRIS, VA, dll).
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                    <span className="text-xs text-zinc-400">Paket 50rb</span>
                    <span className="text-sm font-semibold text-zinc-100">
                      Rp50.000
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                    <span className="text-xs text-zinc-400">Paket 100rb</span>
                    <span className="text-sm font-semibold text-zinc-100">
                      Rp100.000
                    </span>
                  </div>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-400">
                  <Li>Setara ±5 / ±10 unduhan final</Li>
                  <Li>Saldo tidak hangus</Li>
                  <Li>Pembayaran lewat Pakasir</Li>
                </ul>
                <Link
                  href="/register"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-700 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  Isi saldo
                </Link>
              </div>
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs text-zinc-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
              Preview sengaja berwatermark (deterrence). PDF final hanya lewat
              unduhan berbayar / re-download versi lunas.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-zinc-900">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">
                Siap coba di HP?
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Daftar gratis. Butuh waktu ±2 menit sampai draf pertama.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Buat akun <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium text-zinc-400">DokMaker</span>
          </div>
          <p>
            © {new Date().getFullYear()} DokMaker · Pembayaran via Pakasir
          </p>
        </div>
      </footer>
    </div>
  );
}

function Li({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2
        className={
          accent
            ? "mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
            : "mt-0.5 h-4 w-4 shrink-0 text-zinc-600"
        }
      />
      <span>{children}</span>
    </li>
  );
}
