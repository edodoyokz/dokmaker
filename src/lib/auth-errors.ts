/** Map Supabase auth English messages → short Indonesian copy. */
export function mapAuthError(message: string | null | undefined): string {
  if (!message) return "Terjadi kesalahan. Coba lagi.";
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Email atau password salah.";
  }
  if (m.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Cek kotak masuk Anda.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Email sudah terdaftar. Silakan masuk.";
  }
  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("6"))) {
    return "Password terlalu pendek (minimal 6 karakter).";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Koneksi gagal. Periksa internet Anda.";
  }
  if (m.includes("signup is disabled")) {
    return "Pendaftaran sedang ditutup.";
  }
  // Don't leak raw provider strings when we can avoid it.
  if (/^[a-z0-9 _.-]+$/i.test(message) && message.length < 120) {
    return message;
  }
  return "Gagal memproses autentikasi. Coba lagi.";
}
