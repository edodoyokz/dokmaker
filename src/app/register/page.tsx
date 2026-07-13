"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, User, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans leave empty
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (turnstileRequired && !turnstileToken) {
      setError("Selesaikan verifikasi captcha terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          website, // honeypot
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };

      if (!res.ok) {
        setError(mapAuthError(data.error) || data.error || "Gagal mendaftar.");
        setLoading(false);
        return;
      }

      // Hard nav after signup session cookies are set (same stuck-loading issue as login).
      window.location.assign("/app");
    } catch {
      setError("Koneksi gagal. Periksa internet Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 font-sans">
      <div className="z-10 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Daftar Akun Baru</h2>
          <p className="text-sm text-zinc-500">Mulai membuat dokumen profesional Anda sekarang</p>
        </div>

        <div className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5 space-y-4">
            <GoogleSignInButton
              label="Daftar dengan Google"
              onError={setError}
            />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                atau email
              </span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            {/* Honeypot: hidden from humans, bots often auto-fill */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
              tabIndex={-1}
            >
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-xs font-medium text-zinc-400">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="h-4 w-4 text-zinc-600" />
                </span>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-medium text-zinc-400">
                Alamat Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-600" />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-medium text-zinc-400">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-600" />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <TurnstileWidget onToken={setTurnstileToken} />

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (turnstileRequired && !turnstileToken)}
              className="dm-cta w-full gap-2"
            >
              {loading ? "Memproses..." : "Daftar"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Sudah memiliki akun?{" "}
          <Link href="/login" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
            Masuk Di Sini
          </Link>
        </p>
      </div>
    </div>
  );
}
