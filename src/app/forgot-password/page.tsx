"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FileText, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login`,
      });
      if (err) {
        setError(mapAuthError(err.message));
        return;
      }
      setSent(true);
    } catch {
      setError("Gagal mengirim email reset. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="pointer-events-none absolute left-[20%] top-[20%] h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="z-10 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            Lupa password
          </h2>
          <p className="text-sm text-zinc-500">
            Kami kirim tautan reset ke email Anda
          </p>
        </div>

        <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-md">
          {sent ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <p className="text-sm font-semibold text-zinc-200">
                Cek email Anda
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">
                Jika akun dengan email tersebut ada, tautan reset sudah dikirim.
                Periksa folder spam bila belum muncul.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke masuk
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400"
                >
                  Alamat Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-zinc-600" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <p className="text-xs font-medium leading-relaxed text-rose-300">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
              >
                {loading ? "Mengirim…" : "Kirim tautan reset"}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p className="text-center text-sm text-zinc-500">
            <Link
              href="/login"
              className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Kembali ke masuk
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
