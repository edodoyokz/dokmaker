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

describe("PWA contract", () => {
  it("ships a web manifest declaring icons and standalone display", () => {
    const manifest = JSON.parse(
      readFileSync("public/manifest.webmanifest", "utf8")
    );
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
  });

  it("service worker never caches private routes", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    // AGENTS.md §2: PWA caching must not cache private invoice/wallet/payment/PDF data.
    expect(sw).toMatch(/\/app\//);
    expect(sw).toMatch(/\/api\//);
    expect(sw).toMatch(/isPrivate/);
    // No Cache-Control-busting: the SW must return (bypass) for private paths.
    expect(sw).toMatch(/isPrivate\)\s*\{[\s\S]*?return;/);
  });

  it("root layout links the manifest and registers the service worker", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toMatch(/manifest:\s*"\/manifest\.webmanifest"/);
    expect(layout).toMatch(/RegisterSw/);
  });
});
