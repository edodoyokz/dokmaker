import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Rate limiting uses an in-memory fallback when UPSTASH_* env vars are absent
 * (the case in CI/tests). These tests exercise that fallback's accounting.
 * The distributed Upstash path shares the same public contract and is verified
 * in the smoke checklist against staging.
 */
describe("rate limiting (in-memory fallback)", () => {
  beforeEach(() => {
    // Exhaust a unique key per test by deriving from the test name; we simply
    // call with a fresh key each time to avoid cross-test bleed.
  });

  it("allows requests under the limit and returns null", async () => {
    const key = `allow:${Date.now()}:${Math.random()}`;
    const cfg = { limit: 3, windowSeconds: 60 };
    expect(await checkRateLimit(key, cfg)).toBeNull();
    expect(await checkRateLimit(key, cfg)).toBeNull();
    expect(await checkRateLimit(key, cfg)).toBeNull();
  });

  it("returns a 429 response once the limit is exceeded", async () => {
    const key = `deny:${Date.now()}:${Math.random()}`;
    const cfg = { limit: 2, windowSeconds: 60 };
    await checkRateLimit(key, cfg);
    await checkRateLimit(key, cfg);
    const blocked = await checkRateLimit(key, cfg);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    const retryAfter = blocked!.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("isolates buckets by key", async () => {
    const cfg = { limit: 1, windowSeconds: 60 };
    const a = `a:${Date.now()}`;
    const b = `b:${Date.now()}`;
    expect(await checkRateLimit(a, cfg)).toBeNull();
    expect(await checkRateLimit(b, cfg)).toBeNull(); // separate bucket
    expect(await checkRateLimit(a, cfg)).not.toBeNull(); // a exhausted
  });

  it("getRateLimitKey combines action, userId, and client ip", () => {
    const request = new Request("https://x.test/y", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getRateLimitKey(request, "user-1", "download")).toBe(
      "download:user-1:1.2.3.4"
    );
  });
});
