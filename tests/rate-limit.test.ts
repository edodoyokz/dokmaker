import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { checkRateLimit, isProductionWithoutDistributedStore } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

describe("rate-limit", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error allow direct delete
    delete process.env.NODE_ENV;
    // @ts-expect-error allow direct delete
    delete process.env.RATE_LIMIT_REDIS_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does not emit production warning in development", () => {
    process.env.NODE_ENV = "development";
    expect(isProductionWithoutDistributedStore()).toBe(false);

    const result = checkRateLimit("dev-key", { limit: 1, windowSeconds: 60 });
    expect(result).toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("emits a hard warning exactly once in production without Redis", () => {
    process.env.NODE_ENV = "production";
    expect(isProductionWithoutDistributedStore()).toBe(true);

    // First call emits the warning.
    checkRateLimit("prod-key-1", { limit: 100, windowSeconds: 60 });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      "auth",
      expect.stringContaining("RATE_LIMIT_REDIS_URL")
    );

    // Subsequent calls do not re-emit the warning.
    checkRateLimit("prod-key-2", { limit: 100, windowSeconds: 60 });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("does not emit warning in production when Redis URL is configured", () => {
    process.env.NODE_ENV = "production";
    process.env.RATE_LIMIT_REDIS_URL = "redis://localhost:6379";
    expect(isProductionWithoutDistributedStore()).toBe(false);

    checkRateLimit("prod-redis-key", { limit: 1, windowSeconds: 60 });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("still applies per-instance limit in production without Redis", () => {
    process.env.NODE_ENV = "production";
    const config = { limit: 2, windowSeconds: 60 };

    expect(checkRateLimit("limited-key", config)).toBeNull();
    expect(checkRateLimit("limited-key", config)).toBeNull();
    const blocked = checkRateLimit("limited-key", config);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });
});
