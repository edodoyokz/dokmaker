import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("DokMaker smoke test", () => {
  it("should pass basic sanity check", () => {
    expect(true).toBe(true);
  });
});

describe("security headers contract", () => {
  it("next.config.ts defines the required security headers", () => {
    const cfg = readFileSync("next.config.ts", "utf8");
    expect(cfg).toMatch(/Content-Security-Policy/);
    expect(cfg).toMatch(/X-Frame-Options/);
    expect(cfg).toMatch(/X-Content-Type-Options/);
    expect(cfg).toMatch(/Strict-Transport-Security/);
    expect(cfg).toMatch(/Referrer-Policy/);
    expect(cfg).toMatch(/Permissions-Policy/);
  });
});
