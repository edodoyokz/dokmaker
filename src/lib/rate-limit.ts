import { NextResponse } from "next/server";

// In-memory store for rate limiting
// In production, use Redis or similar distributed store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * Check rate limit for a given key.
 * Returns null if allowed, or a 429 response if exceeded.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): NextResponse | null {
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
