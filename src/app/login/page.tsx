"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FileText, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // OAuth callback lands here with ?error=... when exchange fails.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("error");
    if (raw) queueMicrotask(() => setError(mapAuthError(raw)));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(mapAuthError(error.message));
        setLoading(false);
        return;
      }

      // Hard nav so auth cookies are sent on the next full request (soft
      // router.push can leave this page stuck on "Memproses..." if /app hangs).
      window.location.assign("/app");
    } catch {
      setError("Koneksi gagal. Periksa internet Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 font-sans">
      <div className="z-10 w-full max-w-md space-y-6">
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Selamat datang kembali</h2>
          <p className="text-sm text-zinc-500">Masuk ke akun DokMaker Anda</p>
        </div>

        {/* Form Card */}
        <div className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5 space-y-4">
            <GoogleSignInButton onError={setError} />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                atau email
              </span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-400">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-600" />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="dm-cta w-full gap-2"
            >
              {loading ? "Memproses..." : "Masuk"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-zinc-500">
          Belum memiliki akun?{" "}
          <Link href="/register" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
            Daftar Sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
