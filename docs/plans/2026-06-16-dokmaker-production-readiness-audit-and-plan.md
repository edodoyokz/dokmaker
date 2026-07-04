# DokMaker Production-Readiness Audit & Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every blocker between the current DokMaker codebase and an honest, evidence-backed production launch of the invoice-generation PWA.

**Architecture:** Keep the existing modular Next.js 16 + Prisma + Supabase Auth + Pakasir structure (no rewrite). Fix the build pipeline, make the paid PDF deliverable actually work on serverless, add missing security/PWA/env hardening, then execute the smoke checklist with evidence.

**Tech Stack:** Next.js 16, TypeScript, React 19, Tailwind v4, Prisma 6, PostgreSQL, Supabase Auth, Pakasir, Vitest, Puppeteer-core + @sparticuz/chromium (PDF), Upstash Redis (rate limiting).

**Audit date:** 2026-06-16
**Auditor:** Foundation/Security review against `AGENTS.md` §2 (non-negotiable rules) and §10 (production-readiness rule).

---

## Part A — Audit Verdict

**Current state: NOT production-ready.** The financial-safety domain is genuinely strong, but the build pipeline and the paid deliverable (PDF) are broken, and several non-negotiable requirements (PWA, security headers, distributed rate limiting, env contract) are missing.

### Readiness scorecard

| Domain | Status | Evidence |
|---|---|---|
| Financial invariants (wallet/ledger/idempotency) | 🟢 Strong | `wallet/service.ts` append-only ledger, `creditWallet`/`debitWallet` idempotency keys, atomic `$transaction` |
| Webhook safety (Pakasir) | 🟢 Spec-compliant | `handlePakasirWebhook` checks project slug + amount + already-processed + Transaction Detail API |
| Download charging / versioning | 🟢 Correct | per-version idempotency `download:{invoiceId}:{version}`, paid→free re-download, unpaid→charge |
| Authorization (ownership) | 🟢 Good | all services filter by `userId`; `requireUser`/`requireAdmin` guards |
| Admin audit logging | 🟢 Present | `adminAuditLog.create` in template CRUD + wallet adjust |
| Test suite | 🟢 82/82 pass | `npm test` green (but no typecheck gate — see P0-1) |
| **Build / typecheck** | 🔴 **Broken** | `npm run build` fails; `prisma generate` fails without `DATABASE_URL` |
| **PDF generation (paid deliverable)** | 🔴 **Broken in prod** | `puppeteer` is NOT a dependency; Vercel can't run stock Chromium |
| **Security headers** | 🔴 **Missing** | `next.config.ts` is empty — no CSP/HSTS/etc. |
| **Rate limiting** | 🟠 In-memory only | `Map` store → useless on multi-instance serverless |
| **PWA (PRD core requirement)** | 🔴 **Missing** | no manifest, no service worker, no icons in `public/` |
| **Env contract** | 🟠 Missing | no `.env.example` |
| Deployment / ops / monitoring | 🟠 Undocumented | no Vercel config, no Sentry, no runbooks beyond smoke doc |

Legend: 🔴 blocker · 🟠 needs work · 🟢 solid

### Single most important insight

All 24 TypeScript errors (and the failing `next build`) are **not code defects** — they cascade from an un-generated Prisma client. Verified:

```bash
$ DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npx prisma generate
GENERATE_OK
$ npm run typecheck   # → 0 errors
```

Root cause: `prisma.config.ts` uses the strict `env("DATABASE_URL")`, which throws at config-load time whenever the variable is unset, so `prisma generate` (and therefore `postinstall`) fails anywhere `DATABASE_URL` is absent — including CI and fresh checkouts. P0-1 fixes this.

---

## Part B — What is already solid (do not rework)

These passed review and should be preserved:

1. **Wallet ledger is append-only and idempotent.** `creditWallet`/`debitWallet` both check `walletLedgerEntry.idempotencyKey` (unique) before mutating; balance update + ledger insert share one `$transaction`. (`src/modules/wallet/service.ts`)
2. **Webhook cannot double-credit.** `handlePakasirWebhook` rejects on project-slug mismatch, missing payment, amount mismatch, and already-`success` status; credits via `pakasir:{order_id}` idempotency key; confirms via Pakasir Transaction Detail API. (`src/modules/payments/pakasir.ts`)
3. **Download cannot double-charge the same version.** Idempotency key is `download:{invoiceId}:{versionNumber}`; paid versions re-download free; unpaid versions debit + flip to `paid` in one transaction. (`src/modules/downloads/service.ts`)
4. **Invoice versioning matches spec.** Unpaid active version overwrites in place; paid active version spawns a new unpaid version. (`src/modules/invoices/service.ts`)
5. **Ownership is enforced server-side** on every invoice/wallet/download read via `where: { userId }`.
6. **Admin audit trail exists** for template create/update/toggle and wallet adjustment.
7. **Final PDF is streamed, not a public URL**, with `Cache-Control: no-store`. (`src/app/api/invoices/[invoiceId]/download/route.ts`)

---

## Part C — Findings (prioritized)

### P0 — Hard blockers (ship-blocking)

- **P0-1 Build pipeline broken.** No `postinstall: prisma generate`; `prisma.config.ts` hard-requires `DATABASE_URL`. `npm run build` fails.
- **P0-2 PDF generation unusable in production.** `src/lib/pdf/generator.ts` does `import("puppeteer")` but `puppeteer` is not in `package.json`, and stock Puppeteer/Chromium cannot run in Vercel serverless. **The paid product cannot be delivered.**
- **P0-3 No security headers.** `next.config.ts` is `{}`. Missing CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **P0-4 Rate limiting ineffective on serverless.** `src/lib/rate-limit.ts` uses a process-local `Map`; each Vercel instance has its own counter → limits are ~N× looser than intended and brute-force protection is hollow.
- **P0-5 No env contract.** No `.env.example`; required vars are `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PAKASIR_PROJECT_SLUG`, `PAKASIR_BASE_URL`, `PAKASIR_API_KEY`.
- **P0-6 PWA not implemented.** PRD mandates mobile-first PWA; `public/` has only SVGs — no `manifest.webmanifest`, no service worker, no app icons.

### P1 — Hardening (recommended before handling real money)

- **P1-1 Wallet debit can race to negative balance across *different* versions.** `debitWallet` reads balance then increments without a row lock or conditional update. Same-version double-charge is already prevented by idempotency; cross-version concurrency is not. (`AGENTS.md` §2 financial safety.)
- **P1-2 Webhook lacks a second dedup dimension.** Dedup is keyed on `order_id` only; `paymentWebhookEvent.providerEventId` is written but not enforced unique/deduped at intake. Add optional Pakasir signature verification if available.
- **P1-3 Preview deterrence incomplete.** Preview uses an `isPreview` watermark flag but there is no print/copy CSS disabling and no user-email/timestamp watermark overlay. (`AGENTS.md` §2 preview limitation.)
- **P1-4 Secrets hygiene.** Ensure `PAKASIR_API_KEY` is never logged and never reaches client bundles; add a lint/test guard.
- **P1-5 Module barrels are stubs.** `src/modules/{admin,audit,users}/index.ts` just re-export `prisma` — fine, but `audit` should expose a typed `writeAuditLog` helper used everywhere admin writes occur, to prevent future drift.

### P2 — Launch operations

- **P2-1 No deployment config.** No Vercel `maxDuration` (PDF route needs ≥60s), no region pinning, no `vercel.json`.
- **P2-2 No error monitoring.** No Sentry/observability; errors go to `console`.
- **P2-3 No backup/rollback plan executed** (doc exists, not validated).
- **P2-4 Smoke checklist not executed with evidence** (`docs/plans/2026-06-12-dokmaker-smoke-checklist.md`).
- **P2-5 No admin-seed runbook.** First admin role assignment is undocumented.
- **P2-6 Supabase RLS / auth hardening** not verified (auth relies on Supabase; confirm email confirm + RLS on any direct-client tables — currently all reads are server-side, so RLS is defense-in-depth).

---

## Part D — Execution Plan

Each task is self-contained. Run the verification command at the end of every task before moving on. Commit after every task.

### Phase P0 — Unblock the build & the paid deliverable

---

### Task P0-1: Fix the Prisma build pipeline

**Why:** `prisma generate` must succeed without a live DB so CI/Vercel/local all produce the typed client. Verified: once the client is generated, `npm run typecheck` reports **0 errors** and `npm run build` succeeds.

**Files:**
- Modify: `prisma.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Make `prisma.config.ts` tolerant of a missing `DATABASE_URL` during `generate`.**

```ts
// prisma.config.ts
import { defineConfig } from "prisma/config";

// Generate must work in CI/fresh checkouts where no live DB exists.
// migrate/db push/deploy always run with real DATABASE_URL set.
const placeholderUrl =
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? placeholderUrl,
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? placeholderUrl,
  },
});
```

- [ ] **Step 2: Add `postinstall` so the client regenerates after every `npm install` (Vercel included).**

In `package.json` `scripts`, add:

```json
"postinstall": "prisma generate"
```

- [ ] **Step 3: Regenerate and verify the typecheck is clean with NO env vars set.**

```bash
unset DATABASE_URL DIRECT_URL
rm -rf node_modules/.prisma
npx prisma generate   # must succeed WITHOUT DATABASE_URL
npm run typecheck     # must report 0 errors
```
Expected: `GENERATE_OK` equivalent + `tsc --noEmit` exits 0.

- [ ] **Step 4: Commit.**

```bash
git add prisma.config.ts package.json
git commit -m "fix(build): make prisma generate work without DATABASE_URL and run on postinstall"
```

---

### Task P0-2: Make PDF generation work on serverless (puppeteer-core + @sparticuz/chromium)

**Why:** The paid deliverable is a real PDF. Stock `puppeteer` is absent from deps and cannot run on Vercel. Use `puppeteer-core` + `@sparticuz/chromium` (single AWS-Lambda-compatible binary).

**Files:**
- Modify: `package.json` (add deps)
- Modify: `src/lib/pdf/generator.ts`
- Modify: `src/app/api/invoices/[invoiceId]/download/route.ts` (raise route timeout)
- Create: `tests/pdf-engine-serverless.test.ts`

- [ ] **Step 1: Add dependencies.**

```bash
npm install puppeteer-core @sparticuz/chromium
```

- [ ] **Step 2: Rewrite the runtime launcher to use Chromium-for-serverless.**

Replace `loadRuntimePuppeteer` and the launch call in `src/lib/pdf/generator.ts`:

```ts
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// Keep the existing PuppeteerModuleLike/PageLike/BrowserLike interfaces
// so the injected-loadPuppeteer test seam still works unchanged.

async function loadRuntimePuppeteer() {
  return {
    default: {
      launch: async (_opts?: unknown) => {
        const executablePath = await chromium.executablePath();
        return puppeteerCore.launch({
          args: chromium.args,
          executablePath,
          headless: chromium.headless,
          // Vercel/serverless: ignore HTTP size limits for the binary init
          ignoreHTTPSErrors: true,
        }) as unknown as import("puppeteer-core").Browser;
      },
    },
  };
}
```

> Note: the existing `options.loadPuppeteer` seam keeps unit tests hermetic (they inject a fake). The `finally { browser.close() }` already present prevents leaked processes.

- [ ] **Step 3: Raise the download route max duration (PDF render can exceed the default 10s).**

At the top of `src/app/api/invoices/[invoiceId]/download/route.ts`:

```ts
export const maxDuration = 60; // seconds — Vercel Pro/Enterprise allows up to 300
export const dynamic = "force-dynamic";
```

- [ ] **Step 4: Add a test asserting the serverless launcher path is selected in production mode.**

```ts
// tests/pdf-engine-serverless.test.ts
import { describe, it, expect, vi } from "vitest";

describe("serverless pdf launcher", () => {
  it("uses @sparticuz/chromium executable path when running serverless", async () => {
    vi.resetModules();
    vi.doMock("@sparticuz/chromium", () => ({
      default: {
        args: ["--no-sandbox"],
        headless: true,
        executablePath: async () => "/tmp/chromium",
      },
    }));
    vi.doMock("puppeteer-core", () => ({
      default: {
        launch: vi.fn(async (opts: { executablePath: string }) => ({
          isServerless: opts.executablePath === "/tmp/chromium",
          newPage: async () => ({
            setContent: async () => {},
            pdf: async () => Buffer.from("%PDF-1.4 stub"),
          }),
          close: async () => {},
        })),
      },
    }));
    const { generateInvoicePdf } = await import("@/lib/pdf/generator");
    const buf = await generateInvoicePdf({
      meta: { invoiceNumber: "T-1", issueDate: "2026-06-16", dueDate: "2026-06-30" },
      from: { name: "A" },
      to: { name: "B" },
      items: [{ description: "x", quantity: 1, unitPrice: 1000 }],
    });
    expect(buf.toString("ascii", 0, 5)).toBe("%PDF-");
  });
});
```

- [ ] **Step 5: Run tests + verify binary downloads cleanly.**

```bash
npm test -- tests/pdf-engine-serverless.test.ts tests/pdf-generation.test.ts
npm run typecheck
```
Expected: all green.

- [ ] **Step 6: Commit.**

```bash
git add package.json package-lock.json src/lib/pdf/generator.ts \
        src/app/api/invoices/[invoiceId]/download/route.ts \
        tests/pdf-engine-serverless.test.ts
git commit -m "feat(pdf): render real PDFs on serverless via puppeteer-core + @sparticuz/chromium"
```

---

### Task P0-3: Add security headers to `next.config.ts`

**Why:** `AGENTS.md` §2 + baseline web security. Currently `next.config.ts` is empty.

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Write the failing guard (optional, lightweight).** Add to `tests/smoke.test.ts`:

```ts
import { readFileSync } from "node:fs";
it("next.config.ts defines a Content-Security-Policy header", () => {
  const cfg = readFileSync("next.config.ts", "utf8");
  expect(cfg).toMatch(/Content-Security-Policy/);
  expect(cfg).toMatch(/X-Frame-Options/);
  expect(cfg).toMatch(/Strict-Transport-Security/);
});
```
Run `npm test -- tests/smoke.test.ts` → expect FAIL.

- [ ] **Step 2: Implement headers.**

```ts
// next.config.ts
import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next needs inline/eval in dev; tighten post-launch
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
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
```

> Note: preview uses inline styles; `'unsafe-inline'` for styles is acceptable. Tighten `script-src` after verifying no runtime breakage (P2 hardening).

- [ ] **Step 3: Verify build + guard.**

```bash
npm run build
npm test -- tests/smoke.test.ts
```
Expected: build succeeds, guard passes.

- [ ] **Step 4: Commit.**

```bash
git add next.config.ts tests/smoke.test.ts
git commit -m "feat(security): add CSP, HSTS, and standard security headers"
```

---

### Task P0-4: Distributed rate limiting via Upstash Redis

**Why:** `AGENTS.md` §2 financial/payment safety + effective abuse protection. In-memory `Map` is per-instance and useless on Vercel.

**Files:**
- Modify: `package.json`
- Create: `src/lib/rate-limit.ts` (rewrite, keep public API: `checkRateLimit`, `getRateLimitKey`, `RATE_LIMITS`)
- Modify: `.env.example` (add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)

- [ ] **Step 1: Install.**

```bash
npm install @upstash/redis @upstash/ratelimit
```

- [ ] **Step 2: Rewrite `src/lib/rate-limit.ts` with a local fallback for dev.**

```ts
// src/lib/rate-limit.ts
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitConfig {
  limit: number;
  windowSeconds: string; // Ratelimit accepts "60 s", "10 m"
}

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, cfg: RateLimitConfig): Ratelimit {
  let l = limiters.get(name);
  if (!l) {
    if (!redis) throw new Error("Upstash Redis not configured");
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.limit, cfg.windowSeconds as "60 s"),
      prefix: `dokmaker:${name}`,
    });
    limiters.set(name, l);
  }
  return l;
}

// Local in-memory fallback so dev/tests without Upstash still work.
const mem = new Map<string, { count: number; reset: number }>();
function memCheck(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const r = mem.get(key);
  if (!r || now > r.reset) { mem.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (r.count >= limit) return false;
  r.count++;
  return true;
}

export async function checkRateLimit(
  key: string,
  config: { limit: number; windowSeconds: number }
): Promise<NextResponse | null> {
  if (!hasUpstash) {
    const ok = memCheck(key, config.limit, config.windowSeconds * 1000);
    return ok ? null : NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }
  const limiter = getLimiter(key.split(":")[0], {
    limit: config.limit,
    windowSeconds: `${config.windowSeconds} s`,
  });
  const { success } = await limiter.limit(key);
  return success ? null : NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
}

export function getRateLimitKey(request: Request, userId: string, action: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${action}:${userId}:${ip}`;
}

export const RATE_LIMITS = {
  TOP_UP: { limit: 5, windowSeconds: 600 },
  DOWNLOAD: { limit: 10, windowSeconds: 300 },
  WEBHOOK: { limit: 100, windowSeconds: 60 },
  AUTH: { limit: 5, windowSeconds: 900 },
} as const;
```

- [ ] **Step 3: Update all call sites to `await checkRateLimit(...)` (it is now async).**

Files: `src/app/api/webhooks/pakasir/route.ts`, `src/app/api/wallet/topup/route.ts`, `src/app/api/invoices/[invoiceId]/download/route.ts`. Change:
```ts
const rateLimitResponse = checkRateLimit(rateLimitKey, RATE_LIMITS.X);
```
to:
```ts
const rateLimitResponse = await checkRateLimit(rateLimitKey, RATE_LIMITS.X);
```
(The webhook uses `ip` directly, not `getRateLimitKey` — keep as is but `await` it.)

- [ ] **Step 4: Verify.**

```bash
npm run typecheck
npm test
npm run build
```
Expected: all green. (Rate-limit tests that exist still pass via the in-memory fallback when Upstash env is absent.)

- [ ] **Step 5: Commit.**

```bash
git add package.json package-lock.json src/lib/rate-limit.ts \
        src/app/api/webhooks/pakasir/route.ts \
        src/app/api/wallet/topup/route.ts \
        src/app/api/invoices/[invoiceId]/download/route.ts
git commit -m "feat(security): distributed rate limiting via Upstash Redis with local fallback"
```

---

### Task P0-5: Add `.env.example` (env contract)

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create the file.**

```bash
# ── Database (Prisma; required at runtime & migrate) ───────────────────────
DATABASE_URL="postgresql://USER:PASS@HOST:5432/dokmaker?schema=public"
DIRECT_URL="postgresql://USER:PASS@HOST:5432/dokmaker?schema=public"

# ── Supabase (public to client; safe to expose) ────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR-ANON-KEY"

# ── Pakasir (SERVER-ONLY secrets — never expose to client/logs) ────────────
PAKASIR_PROJECT_SLUG="your-pakasir-slug"
PAKASIR_BASE_URL="https://app.pakasir.com"
PAKASIR_API_KEY="YOUR-SECRET-API-KEY"

# ── Upstash Redis (rate limiting; optional in dev) ─────────────────────────
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

- [ ] **Step 2: Add a test guard that PAKASIR_API_KEY stays server-only (never `NEXT_PUBLIC_*`).**

```ts
// tests/env-contract.test.ts
import { readFileSync } from "node:fs";
it("PAKASIR_API_KEY is never exposed as a NEXT_PUBLIC_ variable in source", () => {
  const grep = (re: RegExp) => readFileSync("src", "utf8"); // placeholder
  // Simpler: scan source tree
  const { execSync } = require("node:child_process");
  const out = execSync("grep -rl 'NEXT_PUBLIC_PAKASIR' src || true").toString();
  expect(out.trim()).toBe("");
});
```
Run `npm test -- tests/env-contract.test.ts` → green.

- [ ] **Step 3: Commit.**

```bash
git add .env.example tests/env-contract.test.ts
git commit -m "chore(env): add .env.example contract and secret-exposure guard"
```

---

### Task P0-6: Implement the PWA shell (manifest + service worker + icons)

**Why:** PRD core requirement (`mobile-first PWA`). Currently `public/` has no manifest, SW, or icons.

**Constraint (AGENTS.md §2):** the service worker must NOT cache private invoice/wallet/payment/PDF data. Cache only the public app shell + static assets.

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `public/icon-192.png`, `public/icon-512.png` (generate from a source)
- Modify: `src/app/layout.tsx` (link manifest + theme + register SW)

- [ ] **Step 1: Create the manifest.**

```json
// public/manifest.webmanifest
{
  "name": "DokMaker",
  "short_name": "DokMaker",
  "description": "Buat invoice profesional dalam hitungan detik.",
  "start_url": "/app",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Create a shell-only service worker.**

```js
// public/sw.js
const CACHE = "dokmaker-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything; NEVER cache private/API/PDF responses.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isPrivate =
    url.pathname.startsWith("/app/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin");
  if (e.request.method !== "GET" || isPrivate) return; // always hit network
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
```

- [ ] **Step 3: Link manifest + register SW in `src/app/layout.tsx` `<head>`/body.**

```tsx
// add inside <head> via metadata + a small client registration component
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#09090b" />
```
And a tiny client component `src/components/pwa/register-sw.ts`:
```tsx
"use client";
import { useEffect } from "react";
export function RegisterSw() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
```
Render `<RegisterSw />` once in the root layout.

- [ ] **Step 4: Generate icons** (192/512) from the existing logo or a placeholder; commit PNGs to `public/`.

- [ ] **Step 5: Verify the build and a Lighthouse PWA sanity pass in `npm run build && npm start`.**

```bash
npm run build
```
Expected: build succeeds; `/manifest.webmanifest` and `/sw.js` are served from `public/`.

- [ ] **Step 6: Commit.**

```bash
git add public/manifest.webmanifest public/sw.js public/icon-*.png \
        src/app/layout.tsx src/components/pwa/register-sw.tsx
git commit -m "feat(pwa): add installable manifest, shell-only service worker, and icons"
```

---

### Phase P1 — Financial & security hardening

---

### Task P1-1: Prevent negative-balance race on concurrent debits

**Why:** `debitWallet` reads balance then increments without a lock/conditional update. Two concurrent debits for *different* versions could both pass the balance check.

**Files:**
- Modify: `src/modules/wallet/service.ts`
- Modify: `tests/race-conditions.test.ts`

- [ ] **Step 1: Write a failing test** simulating two concurrent debits that together exceed balance:

```ts
// append to tests/race-conditions.test.ts
it("rejects the second of two concurrent debits that would overdraw", async () => {
  // seed wallet with balance = 10000 (one download price)
  // fire two debitWallet calls in parallel for DIFFERENT idempotency keys
  // assert exactly one succeeds and one throws "Saldo tidak mencukupi"
  // and balance never goes negative
});
```
Run → expect FAIL (current impl can overdraw).

- [ ] **Step 2: Implement a conditional atomic update** inside `debitWallet` after the idempotency check:

```ts
// Replace the plain balance-check + increment with a guarded update:
const updated = await tx.wallet.updateMany({
  where: { id: wallet.id, currentBalance: { gte: amount } },
  data: { currentBalance: { decrement: amount } },
});
if (updated.count === 0) {
  throw new Error("Saldo tidak mencukupi");
}
// ledger entry create stays as-is
```

> `updateMany` returns `{ count }`; the `WHERE balance >= amount` makes the decrement atomic at the row level, eliminating the race. Postgres guarantees statement atomicity for the single UPDATE.

- [ ] **Step 3: Verify.**

```bash
npm test -- tests/race-conditions.test.ts
npm test
```
Expected: all green, including the new overdraw test.

- [ ] **Step 4: Commit.**

```bash
git add src/modules/wallet/service.ts tests/race-conditions.test.ts
git commit -m "fix(wallet): atomic conditional debit to prevent negative-balance race"
```

---

### Task P1-2: Webhook intake dedup by event id + optional signature

**Why:** Defense in depth on the money-in path (AGENTS.md §2 payment safety).

**Files:**
- Modify: `src/modules/payments/pakasir.ts`
- Modify: `src/app/api/webhooks/pakasir/route.ts`
- Modify: `tests/pakasir-webhook.test.ts`

- [ ] **Step 1: Write a failing test** that a second webhook with the same `providerEventId` (but different body) is recorded as `ignored_duplicate` and does not double-credit.

- [ ] **Step 2: Implement** at the top of `handlePakasirWebhook`: upsert a `paymentWebhookEvent` row keyed by `(provider, providerEventId)`; if it already exists with status `processed`, return early. Add a `PAKASIR_WEBHOOK_SECRET` HMAC check on a signature header when the env is present (graceful no-op if Pakasir doesn't provide one yet).

- [ ] **Step 3: Verify** `npm test -- tests/pakasir-webhook.test.ts` → green.

- [ ] **Step 4: Commit.**

```bash
git commit -m "fix(payments): dedup webhook by providerEventId and optional HMAC signature"
```

---

### Task P1-3: Preview deterrence (print/copy disable + identity watermark)

**Why:** AGENTS.md §2 preview limitation — deterrence, not a guarantee.

**Files:**
- Modify: `src/components/invoices/invoice-preview.tsx`
- Modify: `src/app/app/invoices/[invoiceId]/preview/page.tsx`

- [ ] **Step 1:** When `isPreview`, render a diagonal repeating watermark containing the user's email + a timestamp over the document.
- [ ] **Step 2:** Inject CSS `@media print { body { display: none } }` and `user-select: none` on the preview container.
- [ ] **Step 3:** Verify in browser: preview shows watermark, `Ctrl+P` yields blank, final download is clean.
- [ ] **Step 4: Commit.**

---

### Task P1-4: Centralize admin audit logging + secrets guard

**Files:**
- Modify: `src/modules/audit/index.ts`
- Modify: the 3 admin routes that write audit logs
- Add: a test that logs a known string and asserts `PAKASIR_API_KEY` value never appears in any `logger.*` call (mock logger).

- [ ] **Step 1:** Export a typed `writeAuditLog(txOrPrisma, { actorId, action, target, meta })` and use it in all admin mutation routes.
- [ ] **Step 2:** Add the secrets-leak test.
- [ ] **Step 3:** Verify `npm test` → green. Commit.

---

### Phase P2 — Launch operations

---

### Task P2-1: Deployment config (`vercel.json` / project settings)

- [ ] Add `vercel.json` with `maxDuration` for the download + webhook routes (≥60s), and pin a single region co-located with the DB to reduce latency and avoid multi-region wallet race windows.
- [ ] Confirm build command `next build` and that `postinstall: prisma generate` runs.
- [ ] Verify `npm run build` passes locally with production env.

```json
// vercel.json
{
  "regions": ["sin1"],
  "functions": {
    "src/app/api/invoices/[invoiceId]/download/route.ts": { "maxDuration": 60 },
    "src/app/api/webhooks/pakasir/route.ts": { "maxDuration": 30 }
  }
}
```

### Task P2-2: Error monitoring (Sentry)

- [ ] `npm i @sentry/nextjs`; `npx @sentry/wizard@latest -i nextjs`; wire `Sentry.captureException` in the three API error handlers and the two `error.tsx` boundaries.
- [ ] Verify a forced error surfaces in the Sentry project.

### Task P2-3: Backup / rollback plan (validated)

- [ ] Document DB automated backups (managed Postgres PITR), the migration-is-non-destructive rule, and a forward-fix rollback procedure. Confirm `prisma migrate status` is green against staging.

### Task P2-4: Execute smoke checklist with evidence

- [ ] Work through every item in `docs/plans/2026-06-12-dokmaker-smoke-checklist.md` against staging; paste screenshots/logs as evidence into a new `docs/plans/2026-06-16-dokmaker-smoke-evidence.md`.

### Task P2-5: Admin-seed runbook

- [ ] Document how the first user is promoted to `admin` (e.g., a guarded `prisma` script or a Supabase SQL snippet), and that it is logged in `adminAuditLog`.

### Task P2-6: Supabase hardening

- [ ] Confirm email confirmation is ON, RLS is enabled (defense-in-depth even though all reads are server-side), and the anon key cannot read `users`/`wallets`/`invoices`.

---

## Part E — Definition of "Production-Ready" (mapped to AGENTS.md §10)

Launch is unblocked when ALL of the following are true, with evidence:

- [ ] `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` are all green locally and in CI.
- [ ] **Critical user journey passes end-to-end on staging:** register → top up (Pakasir sandbox) → webhook credits wallet → create invoice → preview (watermarked) → buy & download **real PDF** → re-download same version free → edit → new unpaid version.
- [ ] **Pakasir sandbox verification passes** (webhook → API confirmation → credit).
- [ ] **Duplicate webhook test passes** (no double credit). [P1-2]
- [ ] **Duplicate download test passes** (no double debit). [existing, re-verify]
- [ ] **Negative-balance race test passes.** [P1-1]
- [ ] **Authz/data-isolation tests pass** (user A cannot read user B's invoice/wallet/download). [existing]
- [ ] Security headers present in deployed responses (`curl -I`). [P0-3]
- [ ] Rate limiting is distributed (Upstash configured in prod). [P0-4]
- [ ] Env/secrets configured safely; `PAKASIR_API_KEY` never client-exposed or logged. [P0-5, P1-4]
- [ ] PWA installs on mobile (manifest + icons + SW). [P0-6]
- [ ] Rollback/forward-fix plan documented and migration is non-destructive. [P2-3]
- [ ] Smoke checklist completed with evidence. [P2-4]

---

## Part F — Residual risks

1. **Serverless Chromium cold start.** `@sparticuz/chromium` adds 1–3s cold-start latency to the first PDF; mitigate with `maxDuration=60` and consider warming or a dedicated browser service (Browserless) at scale.
2. **Single-region constraint.** Pinning one region for wallet consistency adds latency for far users; acceptable at MVP scale.
3. **Preview deterrence is not absolute.** Per AGENTS.md §2, watermark + print-disable is deterrence only; do not market as screenshot-proof.
4. **Pakasir signature support unknown.** P1-2 is implemented gracefully (HMAC verified only if a secret/header exists); confirm with Pakasir docs whether a signature header is available and enable it.

---

## Execution handoff

**Recommended sequence:** P0-1 → P0-2 → P0-3 → P0-4 → P0-5 → P0-6 → P1-1 → P1-2 → P1-3 → P1-4 → P2-*.

P0-1 is the cheapest, highest-leverage fix (it unblocks the entire build). P0-2 is the most important functional fix (it makes the paid product work). Everything else is hardening and ops.
