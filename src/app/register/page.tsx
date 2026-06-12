"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, User, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

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
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px] top-[20%] left-[20%] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[100px] bottom-[20%] right-[20%] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Daftar Akun Baru</h2>
          <p className="text-sm text-zinc-500">Mulai membuat invoice profesional Anda sekarang</p>
        </div>

        {/* Form Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
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
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
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
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
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
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
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
