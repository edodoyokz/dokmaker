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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not emit production warning in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
    expect(isProductionWithoutDistributedStore()).toBe(false);

    const result = checkRateLimit("dev-key", { limit: 1, windowSeconds: 60 });
    expect(result).toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("emits a hard warning exactly once in production without Redis", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
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
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "redis://localhost:6379");
    expect(isProductionWithoutDistributedStore()).toBe(false);

    checkRateLimit("prod-redis-key", { limit: 1, windowSeconds: 60 });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("still applies per-instance limit in production without Redis", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
    const config = { limit: 2, windowSeconds: 60 };

    expect(checkRateLimit("limited-key", config)).toBeNull();
    expect(checkRateLimit("limited-key", config)).toBeNull();
    const blocked = checkRateLimit("limited-key", config);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });
});
