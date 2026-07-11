/**
 * Cloudflare Turnstile server verify.
 * When TURNSTILE_SECRET_KEY is unset (local dev), verification is skipped.
 * When set, a valid token is required — bots without a solve are rejected.
 */

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Dev / not configured: do not hard-block (honeypot + rate limit still apply).
    return { ok: true };
  }

  if (!token || typeof token !== "string" || token.trim().length < 10) {
    return { ok: false, reason: "Captcha wajib diselesaikan" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token.trim());
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!res.ok) {
    return { ok: false, reason: "Verifikasi captcha gagal" };
  }

  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!data.success) {
    return { ok: false, reason: "Captcha tidak valid. Muat ulang dan coba lagi." };
  }
  return { ok: true };
}

/** True when a bot filled the hidden honeypot field. */
export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function clientIpFromRequest(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
