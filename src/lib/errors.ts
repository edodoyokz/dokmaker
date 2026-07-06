/**
 * Map thrown errors to a safe client-facing message.
 *
 * Production APIs must not leak internal configuration, storage, DB, or payment
 * integration details. We allowlist a small set of user-actionable Indonesian
 * messages thrown by domain services and collapse everything else into a
 * generic "Internal server error". The real error should still be logged
 * server-side by the caller.
 *
 * Add to SAFE_MESSAGES only messages that are intentionally user-facing.
 */
export const SAFE_API_MESSAGES = [
  // Auth
  "Unauthorized",
  "Forbidden",
  // Domain - invoice / version
  "Invoice tidak ditemukan",
  "Versi aktif tidak ditemukan",
  "Status versi tidak valid",
  "Download invoice sedang diproses atau sudah dibayar",
  // Domain - wallet
  "Wallet tidak ditemukan",
  "Saldo tidak mencukupi",
  // Domain - payment / top up
  "Nominal top up tidak valid. Pilih Rp50.000 atau Rp100.000",
  // Admin
  "User tidak ditemukan",
  // Route-level validation
  "Type, amount, dan reason wajib diisi",
  "Type harus credit atau debit",
  "Amount harus lebih dari 0",
  "Amount wajib diisi",
  "Missing required fields",
  "Idempotency key required",
  "Template ID dan content wajib diisi",
  "Content wajib diisi",
  // Domain - AI invoice
  "File harus berupa gambar JPG, PNG, atau WebP",
  "Ukuran gambar maksimal 5MB",
  "Sesi AI tidak ditemukan",
  "Limit analisa gratis habis",
  "Instruksi perubahan wajib diisi",
  "Instruksi perubahan terlalu panjang",
  "Pilih minimal satu field untuk diubah atau tulis instruksi",
  "Disclaimer wajib disetujui",
  "Analisa gambar wajib dilakukan terlebih dahulu",
  "Generate AI gagal",
  "Hasil AI tidak ditemukan",
] as const;

const DEFAULT_FALLBACK = "Internal server error";

/**
 * Returns a safe error message for the client, or `fallback` (default
 * "Internal server error") if the error is not on the allowlist.
 */
export function safeApiError(
  error: unknown,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (error instanceof Error) {
    if (SAFE_API_MESSAGES.some((message) => error.message === message)) {
      return error.message;
    }
    // Some messages use dynamic suffixes (e.g. "Saldo tidak mencukupi. Diperlukan Rp...").
    if (error.message.startsWith("Saldo tidak mencukupi")) {
      return error.message;
    }
  }
  return fallback;
}
