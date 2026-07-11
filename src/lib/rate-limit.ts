import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * When Upstash env vars are set we use a distributed Redis-backed limiter so
 * every serverless instance shares one counter (the in-memory Map approach used
 * previously is per-process and therefore ~N× looser on multi-instance deploys).
 * When they are absent (local dev / tests) we fall back to an in-memory store.
 */
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

// Cache one Ratelimit per action prefix so we don't reconstruct on each call.
const limiters = new Map<string, Ratelimit>();

function getLimiter(action: string, cfg: RateLimitConfig): Ratelimit {
  let limiter = limiters.get(action);
  if (!limiter) {
    if (!redis) {
      throw new Error("Upstash Redis not configured");
    }
    limiter = new Ratelimit({
      redis,
      // Ratelimit slidingWindow takes a humanized duration string.
      limiter: Ratelimit.slidingWindow(cfg.limit, `${cfg.windowSeconds} s`),
      prefix: `dokmaker:${action}`,
      analytics: false,
    });
    limiters.set(action, limiter);
  }
  return limiter;
}

// ── In-memory fallback (dev / tests without Upstash) ────────────────────────
const memStore = new Map<string, { count: number; resetTime: number }>();

function memCheck(
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  const record = memStore.get(key);
  if (!record || now > record.resetTime) {
    memStore.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }
  if (record.count >= limit) {
    return tooManyRequests(record.resetTime - now);
  }
  record.count++;
  return null;
}

function tooManyRequests(retryAfterMs: number): NextResponse {
  const retryAfter = Math.ceil(retryAfterMs / 1000);
  return NextResponse.json(
    {
      error: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
      retryAfter,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}

/**
 * Check rate limit for a given key.
 * Returns null if allowed, or a 429 NextResponse if exceeded.
 *
 * Now async because the distributed (Upstash) path performs a network round
 * trip. Callers must `await` the result.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  if (!hasUpstash) {
    return memCheck(key, config.limit, config.windowSeconds * 1000);
  }

  // key shape: "<action>:<userId>:<ip>" (see getRateLimitKey) — use the leading
  // segment as the limiter prefix so each action gets its own bucket sizing.
  const action = key.split(":", 1)[0] || "default";
  const limiter = getLimiter(action, config);
  const { success, reset } = await limiter.limit(key);
  if (success) return null;
  const retryAfterMs = Math.max(0, reset - Date.now());
  return tooManyRequests(retryAfterMs);
}

/**
 * Generate rate limit key from request and user ID.
 */
export function getRateLimitKey(
  request: Request,
  userId: string,
  action: string
): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${action}:${userId}:${ip}`;
}

// Pre-configured rate limiters
export const RATE_LIMITS = {
  /** Top up: max 5 per 10 minutes */
  TOP_UP: { limit: 5, windowSeconds: 600 },
  /** Download: max 10 per 5 minutes */
  DOWNLOAD: { limit: 10, windowSeconds: 300 },
  /** Webhook: max 100 per minute (generous for legitimate webhooks) */
  WEBHOOK: { limit: 100, windowSeconds: 60 },
  /** Auth: max 5 attempts per 15 minutes */
  AUTH: { limit: 5, windowSeconds: 900 },
  /** Place autocomplete: max 30 per minute (Nominatim-friendly) */
  PLACES: { limit: 30, windowSeconds: 60 },
} as const;
