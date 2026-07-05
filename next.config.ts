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
  // @sparticuz/chromium ships a 64MB brotli-compressed binary in bin/ that
  // must resolve at runtime. If bundled/relocated by webpack, the path breaks.
  // puppeteer-core is also runtime-only. See:
  // https://github.com/Sparticuz/chromium#bundler-configuration
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Force the Vercel nft file tracer to include the chromium binaries in the
  // serverless function output. Without this, the 64MB chromium.br is stripped
  // from the deployment and /var/task/node_modules/@sparticuz/chromium/bin is
  // missing at runtime.
  outputFileTracingIncludes: {
    "/api/invoices/[invoiceId]/download": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
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
