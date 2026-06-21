import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// In-memory store for rate limiting.
// Suitable for local development and single-instance deployments only.
// In production on serverless / multi-instance (e.g. Vercel), counters are
// per-instance and reset on cold starts, so rate limiting is NOT reliable.
// Configure RATE_LIMIT_REDIS_URL in production to switch to a distributed
// limiter (not yet implemented; see docs/production/env-checklist.md).
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

let productionWarningEmitted = false;

/**
 * Returns true when production rate limiting is expected to be backed by a
 * distributed store but is not configured. Exposed for tests.
 */
export function isProductionWithoutDistributedStore(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    !process.env.RATE_LIMIT_REDIS_URL
  );
}

function emitProductionWarningOnce(): void {
  if (productionWarningEmitted) return;
  productionWarningEmitted = true;
  logger.error(
    "auth",
    "Production rate limiting is running on an in-memory store. " +
      "Configure RATE_LIMIT_REDIS_URL (Redis/Upstash/Vercel KV) for reliable " +
      "multi-instance rate limiting. Until then, rate limits reset per " +
      "instance/cold start and may be bypassed by distributed traffic."
  );
}

/**
 * Check rate limit for a given key.
 * Returns null if allowed, or a 429 response if exceeded.
 *
 * In production without a distributed store, we still apply per-instance
 * limiting as defense-in-depth but emit a hard warning so operators know
 * the limit is not globally reliable.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): NextResponse | null {
  if (isProductionWithoutDistributedStore()) {
    emitProductionWarningOnce();
  }

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window or expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }

  if (record.count >= config.limit) {
    // Rate limit exceeded
    return NextResponse.json(
      {
        error: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((record.resetTime - now) / 1000)),
        },
      }
    );
  }

  // Increment counter
  record.count++;
  return null;
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
} as const;
