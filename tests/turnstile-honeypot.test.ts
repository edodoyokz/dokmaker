import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isHoneypotFilled,
  verifyTurnstileToken,
} from "@/lib/turnstile";

describe("isHoneypotFilled", () => {
  it("treats empty / whitespace / non-string as human", () => {
    expect(isHoneypotFilled("")).toBe(false);
    expect(isHoneypotFilled("   ")).toBe(false);
    expect(isHoneypotFilled(undefined)).toBe(false);
    expect(isHoneypotFilled(null)).toBe(false);
  });

  it("flags any non-empty string as bot", () => {
    expect(isHoneypotFilled("https://spam.example")).toBe(true);
    expect(isHoneypotFilled("x")).toBe(true);
  });
});

describe("verifyTurnstileToken", () => {
  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
    vi.unstubAllGlobals();
  });

  it("allows all tokens when secret is not configured", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(verifyTurnstileToken(undefined)).resolves.toEqual({ ok: true });
  });

  it("rejects missing token when secret is configured", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const r = await verifyTurnstileToken("");
    expect(r.ok).toBe(false);
  });

  it("accepts token when Cloudflare returns success", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    );
    await expect(verifyTurnstileToken("valid-token-abc")).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects when Cloudflare returns failure", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      })
    );
    const r = await verifyTurnstileToken("bad-token-xyz");
    expect(r.ok).toBe(false);
  });
});
