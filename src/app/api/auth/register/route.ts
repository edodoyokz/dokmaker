import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  clientIpFromRequest,
  isHoneypotFilled,
  verifyTurnstileToken,
} from "@/lib/turnstile";
import { mapAuthError } from "@/lib/auth-errors";
import { logger } from "@/lib/logger";

/**
 * Server-gated register.
 * Blocks bulk signup bots with: IP rate limit, honeypot, optional Turnstile.
 * Note: bots can still hit Supabase Auth /signup with the public anon key
 * unless Turnstile is also enabled in the Supabase dashboard (same site key).
 */
export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = await checkRateLimit(`auth-register:${ip}`, RATE_LIMITS.AUTH);
    if (limited) return limited;

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      website?: string; // honeypot
      turnstileToken?: string;
    };

    // Silent success for honeypot fillers — don't train bots with error shapes.
    if (isHoneypotFilled(body.website)) {
      logger.warn("auth", "Register honeypot tripped", { ip });
      return NextResponse.json({ ok: true });
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password terlalu pendek (minimal 6 karakter)." },
        { status: 400 }
      );
    }

    const captcha = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.reason }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || undefined },
        // When Supabase dashboard has captcha enabled, this token is required.
        captchaToken: body.turnstileToken || undefined,
      },
    });

    if (error) {
      logger.auth("Register failed", { message: error.message, ip });
      return NextResponse.json(
        { error: mapAuthError(error.message) },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("auth", "Register route error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Gagal memproses pendaftaran. Coba lagi." },
      { status: 500 }
    );
  }
}
