"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth-errors";

type Props = {
  /** Called when OAuth start fails (parent shows the message). */
  onError?: (message: string) => void;
  label?: string;
};

/**
 * Starts Google OAuth via Supabase.
 * Enable the Google provider in Supabase → Auth → Providers first;
 * until then this returns a clear error from Supabase.
 */
export function GoogleSignInButton({
  onError,
  label = "Lanjutkan dengan Google",
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/app`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        onError?.(mapAuthError(error.message));
        setLoading(false);
      }
      // On success the browser leaves this page for Google.
    } catch {
      onError?.("Koneksi gagal. Periksa internet Anda.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleGlyph />
      {loading ? "Mengalihkan..." : label}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.3 5.3C39.1 37.2 44 32 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
