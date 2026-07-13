import { describe, expect, it } from "vitest";
import config from "../next.config";

describe("security headers", () => {
  it("defines headers for all routes plus same-origin PDF preview", async () => {
    expect(typeof config.headers).toBe("function");
    const headers = await (config.headers as () => Promise<
      { source: string; headers: { key: string; value: string }[] }[]
    >)();

    expect(headers).toHaveLength(2);

    const preview = headers.find((h) =>
      h.source.includes("/api/invoices/")
    );
    const rest = headers.find((h) => h.source.includes("(?!"));
    expect(preview).toBeDefined();
    expect(rest).toBeDefined();

    const find =
      (entries: { key: string; value: string }[]) => (key: string) =>
        entries.find((h) => h.key === key)?.value;

    const previewFind = find(preview!.headers);
    expect(previewFind("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(previewFind("Content-Security-Policy")).toContain(
      "frame-ancestors 'self'"
    );
    expect(previewFind("Content-Security-Policy")).not.toContain(
      "frame-ancestors 'none'"
    );

    const restFind = find(rest!.headers);
    expect(restFind("X-Frame-Options")).toBe("DENY");
    expect(restFind("X-Content-Type-Options")).toBe("nosniff");
    expect(restFind("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(restFind("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()"
    );

    const csp = restFind("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
    );
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });
});
