"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Upload, Wand2, Download, AlertCircle, RefreshCw } from "lucide-react";

type AnalysisField = { label: string; value: string };
type Analysis = {
  summary?: string;
  documentType?: string;
  colors?: string[];
  sections?: string[];
  detectedText?: string[];
  fields?: AnalysisField[];
};
type Output = { id: string; status: string; outputImageStorageKey?: string | null };
type Session = {
  id: string;
  status: string;
  analysisSummary?: string | null;
  analysisJson?: Analysis | null;
  outputs: Output[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
}

// Stable JSON-serializable signature of the intended change request.
// If the user edits a field or the instruction, a new idempotency key is
// generated; a retry after a lost server response reuses the key and the
// server returns the existing output instead of debiting a second time.
function signatureOf(fieldEdits: { label: string; from: string; to: string }[], instruction: string): string {
  return JSON.stringify({ f: fieldEdits.map((e) => [e.label, e.from, e.to]), i: instruction.trim() });
}

export function AiInvoiceGenerator({ price }: { price: number }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [instruction, setInstruction] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingGeneration = useRef<{ key: string; sig: string } | null>(null);

  function applyAnalysis(s: Session) {
    const fields = s.analysisJson?.fields ?? [];
    if (fields.length) {
      const next: Record<string, string> = {};
      for (const f of fields) next[f.label] = f.value;
      setFieldValues(next);
    }
  }

  async function upload() {
    if (!file) return setError("Pilih gambar referensi dulu");
    setLoading("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ai-invoice/sessions", { method: "POST", body: form });
      setSession(await readJson(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setLoading(null);
    }
  }

  async function analyze() {
    if (!session) return;
    setLoading("analyze");
    setError(null);
    try {
      const res = await fetch(`/api/ai-invoice/sessions/${session.id}/analyze`, { method: "POST" });
      const fresh = await readJson(res);
      setSession(fresh);
      applyAnalysis(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisa gagal");
    } finally {
      setLoading(null);
    }
  }

  async function generate() {
    if (!session) return;
    setLoading("generate");
    setError(null);
    const fieldEdits = (session.analysisJson?.fields ?? [])
      .filter((f) => fieldValues[f.label] !== f.value)
      .map((f) => ({ label: f.label, from: f.value, to: fieldValues[f.label] ?? "" }));
    const sig = signatureOf(fieldEdits, instruction);
    if (!pendingGeneration.current || pendingGeneration.current.sig !== sig) {
      pendingGeneration.current = { key: crypto.randomUUID(), sig };
    }
    const idempotencyKey = pendingGeneration.current.key;
    try {
      const res = await fetch(`/api/ai-invoice/sessions/${session.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldEdits, instruction, disclaimerAccepted: accepted, idempotencyKey }),
      });
      await readJson(res);
      pendingGeneration.current = null;
      const fresh = await fetch(`/api/ai-invoice/sessions/${session.id}`);
      setSession(await readJson(fresh));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generate gagal";
      if (message.toLowerCase().includes("saldo")) {
        setError(`${message}. Silakan top up saldo terlebih dahulu.`);
      } else {
        setError(message);
      }
    } finally {
      setLoading(null);
    }
  }

  const successOutput = session?.outputs?.find((output) => output.status === "success");
  const analysisFields = session?.analysisJson?.fields ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-100">
          AI Generate dari Gambar <Sparkles className="h-5 w-5 text-purple-400" />
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload referensi invoice, analisa gratis terbatas, lalu generate gambar AI berbayar saldo.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
        <label htmlFor={inputId} className="block text-sm font-semibold text-zinc-200">1. Upload gambar referensi</label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300"
        />
        <button onClick={upload} disabled={!file || !!loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          <Upload className="h-4 w-4" /> {loading === "upload" ? "Mengupload..." : "Upload Referensi"}
        </button>
      </section>

      {session && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">2. Analisa AI gratis terbatas</h2>
          {session.analysisSummary ? (
            <div className="space-y-2">
              <p className="rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">{session.analysisSummary}</p>
              <button onClick={analyze} disabled={!!loading} className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50">
                <Wand2 className="h-3.5 w-3.5" /> Analisa ulang
              </button>
            </div>
          ) : (
            <button onClick={analyze} disabled={!!loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              <Wand2 className="h-4 w-4" /> {loading === "analyze" ? "Menganalisa..." : "Analisa Gratis"}
            </button>
          )}
        </section>
      )}

      {session?.analysisSummary && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">3. Ubah field yang ingin diganti</h2>
          {analysisFields.length > 0 ? (
            <div className="space-y-3">
              {analysisFields.map((field) => (
                <label key={field.label} className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-400">{field.label}</span>
                  <input
                    value={fieldValues[field.label] ?? ""}
                    onChange={(event) => setFieldValues((prev) => ({ ...prev, [field.label]: event.target.value }))}
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500"
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Tidak ada field terdeteksi. Gunakan instruksi tambahan di bawah.</p>
          )}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Instruksi tambahan (opsional)</span>
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Contoh: ganti warna jadi biru, hapus kolom pajak, tambah item jasa desain 1 x Rp500.000"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-indigo-500"
            />
          </label>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1" />
              <span>Hasil dibuat oleh AI berdasarkan referensi dan instruksi pengguna. Pengguna bertanggung jawab penuh atas hak penggunaan, isi, klaim, dan konsekuensi hukum. DokMaker dapat menolak penggunaan yang melanggar hukum atau merugikan pihak lain.</span>
            </label>
          </div>
          <button onClick={generate} disabled={!!loading || !accepted} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {loading === "generate" ? "Generating..." : `Generate & Potong Saldo ${formatCurrency(price)}`}
          </button>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error} {error.toLowerCase().includes("saldo") && <Link href="/app/wallet" className="font-semibold underline">Top up saldo</Link>}</p>
        </div>
      )}

      {successOutput && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-200">Hasil siap diunduh</h2>
          {/* ponytail: no watermark — paid output, user owns this version. Add deterrence if abuse appears. */}
          <img
            src={`/api/ai-invoice/outputs/${successOutput.id}/download`}
            alt="Preview hasil AI"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950"
          />
          <a
            href={`/api/ai-invoice/outputs/${successOutput.id}/download`}
            download={`ai-invoice-${successOutput.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" /> Download Gambar AI
          </a>
          <p className="text-center text-xs text-zinc-400">Hasil kurang tepat? Generate ulang untuk variasi gambar berbeda (dikenakan biaya).</p>
          <button onClick={generate} disabled={!!loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-4 py-3 text-sm font-semibold text-indigo-200 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading === "generate" ? "animate-spin" : ""}`} /> {loading === "generate" ? "Generating..." : `Generate Ulang ${formatCurrency(price)}`}
          </button>
        </section>
      )}
    </div>
  );
}
