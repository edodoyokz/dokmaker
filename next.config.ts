import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 * - 'unsafe-inline'/'unsafe-eval' for scripts: Next.js requires these in dev and
 *   for some runtime inline scripts; tighten in a follow-up hardening pass once
 *   a nonce-based policy is in place.
 * - connect-src whitelists Supabase (auth/DB) and Pakasir (payment redirect API).
 * - frame-ancestors 'none' everywhere except the stamp-preview PDF endpoint,
 *   which must be iframe-able same-origin.
 */
const cspDirectives = [
  "default-src 'self'",
  // challenges.cloudflare.com: Cloudflare Turnstile on /register
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://app.pakasir.com https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
];

const cspDenyFraming = [...cspDirectives, "frame-ancestors 'none'"].join("; ");
const cspSameOriginFrame = [...cspDirectives, "frame-ancestors 'self'"].join(
  "; "
);

const commonSecurityHeaders = [
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDenyFraming },
  { key: "X-Frame-Options", value: "DENY" },
  ...commonSecurityHeaders,
];

/** PDF stamp draft preview is embedded in an iframe on the invoice preview page. */
const previewPdfSecurityHeaders = [
  { key: "Content-Security-Policy", value: cspSameOriginFrame },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ...commonSecurityHeaders,
];

const nextConfig: NextConfig = {
  // @sparticuz/chromium and puppeteer-core must not be bundled by webpack;
  // resolve them from node_modules at runtime. The chromium binary itself
  // is downloaded from R2 on cold start (see src/lib/pdf/generator.ts).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  async headers() {
    return [
      // More specific source first — must not inherit frame-ancestors 'none'.
      {
        source: "/api/invoices/:invoiceId/preview",
        headers: previewPdfSecurityHeaders,
      },
      {
        // Everything else (exclude stamp preview so headers don't merge-deny).
        source: "/((?!api/invoices/.*/preview$).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
