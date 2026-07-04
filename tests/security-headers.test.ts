import { describe, expect, it } from "vitest";
import config from "../next.config";

describe("security headers", () => {
  it("defines headers for all routes", async () => {
    expect(typeof config.headers).toBe("function");
    const headers = await (config.headers as () => Promise<
      { source: string; headers: { key: string; value: string }[] }[]
    >)();

    expect(headers).toHaveLength(1);
    expect(headers[0].source).toBe("/(.*)");

    const entries = headers[0].headers;
    const find = (key: string) => entries.find((h) => h.key === key)?.value;

    expect(find("X-Frame-Options")).toBe("DENY");
    expect(find("X-Content-Type-Options")).toBe("nosniff");
    expect(find("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(find("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()"
    );

    const csp = find("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });
});
