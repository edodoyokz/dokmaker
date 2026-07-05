import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 * - 'unsafe-inline'/'unsafe-eval' for scripts: Next.js requires these in dev and
 *   for some runtime inline scripts; tighten in a follow-up hardening pass once
 *   a nonce-based policy is in place.
 * - connect-src whitelists Supabase (auth/DB) and Pakasir (payment redirect API).
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://app.pakasir.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // @sparticuz/chromium and puppeteer-core must not be bundled by webpack;
  // resolve them from node_modules at runtime. The chromium binary itself
  // is downloaded from R2 on cold start (see src/lib/pdf/generator.ts).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
