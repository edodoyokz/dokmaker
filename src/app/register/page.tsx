"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, User, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { mapAuthError } from "@/lib/auth-errors";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(mapAuthError(error.message));
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 font-sans">
      <div className="z-10 w-full max-w-md space-y-6">
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Daftar Akun Baru</h2>
          <p className="text-sm text-zinc-500">Mulai membuat dokumen profesional Anda sekarang</p>
        </div>

        {/* Form Card */}
        <div className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
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
              {loading ? "Memproses..." : "Daftar"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Footer text */}
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
