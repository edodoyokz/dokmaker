# Production Audit Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the highest-risk production blockers from the DokMaker codebase audit: Pakasir webhook verification/idempotency, download recovery semantics, env/deploy consistency, CI gates, and launch evidence.

**Architecture:** Keep all wallet/payment mutations server-side and transactional. Harden external payment verification before crediting wallet, make duplicate webhook/download behavior cleanly idempotent, and add release gates that prove lint/typecheck/tests/build/Prisma checks pass before deployment. Avoid broad rewrites; each task is a small TDD-first hardening slice.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Vitest, Supabase Auth, Pakasir, Cloudflare R2/S3-compatible storage, GitHub Actions/Vercel.

---

## Execution Rules

- Follow `AGENTS.md` financial safety rules.
- Do not expose real secrets in logs, tests, docs, or CI output.
- Write or update tests before implementation for business-critical logic.
- Run focused tests after every task.
- Commit after each completed task.
- Do not call the project production-ready until all P0 tasks and verification evidence are complete.

---

## P0 Task 1: Harden Pakasir webhook body and Transaction Detail verification

**Why:** Current webhook handling does not require incoming body `status === "completed"` and does not explicitly compare transaction-detail `amount`, `project`, and `order_id` before crediting wallet.

**Files:**
- Modify: `src/modules/payments/pakasir.ts`
- Modify: `src/app/api/webhooks/pakasir/route.ts`
- Test: `tests/pakasir-webhook.test.ts`

**Step 1: Inspect existing webhook tests**

Run:

```bash
npm test -- tests/pakasir-webhook.test.ts
```

Expected: current tests pass before changes.

**Step 2: Add failing tests for incomplete webhook verification**

In `tests/pakasir-webhook.test.ts`, add tests for:

1. Reject webhook body when `status !== "completed"`.
2. Reject webhook body when `status` is missing.
3. Reject when Pakasir detail `order_id` does not match local order id.
4. Reject when Pakasir detail `amount` does not match local payment amount.
5. Reject when Pakasir detail `project` does not match configured slug.
6. Reject when Pakasir detail `status !== "completed"`.

Suggested assertions:

```ts
await expect(handlePakasirWebhook({
  project: "dokmaker-test",
  order_id: payment.providerOrderId,
  amount: 50000,
  status: "pending",
})).rejects.toThrow(/completed/i);
```

For detail mismatch tests, mock `global.fetch` to return JSON such as:

```ts
{
  status: "completed",
  project: "wrong-project",
  order_id: payment.providerOrderId,
  amount: 50000,
  reference: "PAKASIR-REF-1"
}
```

Expected: new tests fail because implementation does not validate these fields yet.

**Step 3: Extend webhook input type**

In `src/modules/payments/pakasir.ts`, change input type from:

```ts
export async function handlePakasirWebhook(body: {
  project: string;
  order_id: string;
  amount: number;
  api_key?: string;
})
```

to include status:

```ts
export async function handlePakasirWebhook(body: {
  project: string;
  order_id: string;
  amount: number;
  status?: string;
  api_key?: string;
})
```

Then destructure `status`.

**Step 4: Validate incoming webhook status before DB mutation**

Add after project validation or before payment lookup:

```ts
if (status !== "completed") {
  throw new Error("Status webhook Pakasir belum completed");
}
```

**Step 5: Validate Transaction Detail fields**

After:

```ts
const detail = await detailResponse.json();
```

add explicit checks:

```ts
if (detail.status !== "completed") {
  throw new Error("Transaksi belum completed di Pakasir");
}

if (detail.project !== project) {
  throw new Error("Project detail Pakasir tidak sesuai");
}

if (detail.order_id !== order_id) {
  throw new Error("Order ID detail Pakasir tidak sesuai");
}

if (Number(detail.amount) !== payment.amount) {
  throw new Error("Amount detail Pakasir tidak sesuai");
}
```

Keep the local webhook body amount check too:

```ts
if (payment.amount !== amount) {
  throw new Error("Amount tidak sesuai");
}
```

**Step 6: Ensure route passes status to service**

In `src/app/api/webhooks/pakasir/route.ts`, ensure parsed body forwards `status` to `handlePakasirWebhook`. If route currently validates only `project`, `order_id`, `amount`, update validation to require `status` and reject missing/invalid body with 400.

**Step 7: Run focused tests**

Run:

```bash
npm test -- tests/pakasir-webhook.test.ts
```

Expected: all Pakasir webhook tests pass.

**Step 8: Commit**

```bash
git add src/modules/payments/pakasir.ts src/app/api/webhooks/pakasir/route.ts tests/pakasir-webhook.test.ts
git commit -m "fix: harden pakasir webhook verification"
```

---

## P0 Task 2: Make duplicate Pakasir webhook processing atomically idempotent

**Why:** Current code checks `payment.status === "success"` before transaction. Concurrent duplicate webhooks can pass the pre-check and cause noisy transaction/unique-key failures even if double-credit is mostly prevented.

**Files:**
- Modify: `src/modules/payments/pakasir.ts`
- Test: `tests/pakasir-webhook.test.ts`
- Test: `tests/race-conditions.test.ts` if concurrent tests already live there

**Step 1: Add failing duplicate/concurrency tests**

Add or extend tests to cover:

1. Calling `handlePakasirWebhook()` twice sequentially returns `{ status: "credited" }` then `{ status: "already_processed" }` or equivalent clean idempotent response.
2. Calling it concurrently with `Promise.allSettled([call1, call2])` does not double-credit wallet.
3. No uncaught Prisma unique violation leaks to caller on duplicate webhook.

Expected: at least concurrency/noisy duplicate test fails or is not guaranteed with current implementation.

**Step 2: Replace pre-transaction success check with transactional claim**

Keep a fast read check if desired, but do not rely on it. Inside the transaction, before crediting wallet, claim the payment:

```ts
const claim = await tx.paymentTransaction.updateMany({
  where: {
    id: payment.id,
    status: { not: "success" },
  },
  data: {
    status: "success",
    paidAt: new Date(),
    providerReference: detail.reference || null,
  },
});

if (claim.count !== 1) {
  return;
}
```

Because returning from inside `$transaction` can be awkward for the outer status, use a local variable:

```ts
let credited = false;

await prisma.$transaction(async (tx) => {
  const claim = await tx.paymentTransaction.updateMany(...);
  if (claim.count !== 1) return;

  await creditWallet(...);
  await tx.paymentWebhookEvent.create(...);
  credited = true;
});

return { status: credited ? "credited" : "already_processed" };
```

**Step 3: Keep wallet idempotency key unchanged**

Do not change:

```ts
`pakasir:${order_id}`
```

This stable key is required to prevent duplicate credit.

**Step 4: Consider webhook event uniqueness**

If `PaymentWebhookEvent.providerEventId` is stable enough as `order_id`, add a future migration task for a uniqueness constraint. Do not add migration in this task unless tests confirm it is safe with existing data.

**Step 5: Run focused tests**

Run:

```bash
npm test -- tests/pakasir-webhook.test.ts tests/race-conditions.test.ts
```

Expected: duplicate/concurrent webhook tests pass.

**Step 6: Commit**

```bash
git add src/modules/payments/pakasir.ts tests/pakasir-webhook.test.ts tests/race-conditions.test.ts
git commit -m "fix: make pakasir webhook idempotent"
```

---

## P0 Task 3: Make download failure recovery safe and retryable

**Why:** Current catch block changes any unpaid download failure to `generation_failed`, then later calls reject that status. Transient PDF/storage failures can strand a version even when no wallet debit happened.

**Files:**
- Modify: `src/modules/downloads/service.ts`
- Test: `tests/download-flow.test.ts`
- Test: `tests/race-conditions.test.ts` if download concurrency tests exist there

**Step 1: Add failing tests for retry semantics**

Add tests for:

1. PDF generation failure after status claim resets invoice version from `processing_payment` back to `unpaid`.
2. Storage failure before debit resets invoice version back to `unpaid`.
3. A retry after PDF/storage transient failure can succeed and charge exactly once.
4. If the version is already `paid`, catch block must never overwrite it to `generation_failed`.

Expected: current implementation fails reset/retry tests because status becomes `generation_failed` and retry is rejected.

**Step 2: Track failure phase**

In `processDownload`, inside the unpaid branch, add a phase flag:

```ts
let debitTransactionStarted = false;
```

Set it immediately before the Prisma transaction that calls `debitWallet`:

```ts
debitTransactionStarted = true;
await prisma.$transaction(async (tx) => { ... });
```

**Step 3: Reset pre-debit failures to unpaid**

Change catch block from unconditional `generation_failed` to conditional recovery:

```ts
} catch (error) {
  if (!debitTransactionStarted) {
    await prisma.invoiceVersion.updateMany({
      where: { id: activeVersion.id, status: "processing_payment" },
      data: { status: "unpaid" },
    });
  } else {
    await prisma.invoiceVersion.updateMany({
      where: { id: activeVersion.id, status: "processing_payment" },
      data: { status: "generation_failed" },
    });
  }
  throw error;
}
```

Use `updateMany` with `status: "processing_payment"` so a paid version is not overwritten.

**Step 4: Decide policy for `generation_failed`**

Minimal safe policy for this task:

- Pre-debit failures return to `unpaid`.
- Post-debit transaction failures should usually rollback the debit and leave status `processing_payment`; catch can mark `generation_failed` only if still `processing_payment`.
- Do not auto-retry `generation_failed` unless tests prove no debit exists.

Optional later task: admin recovery action for `generation_failed`.

**Step 5: Run focused tests**

Run:

```bash
npm test -- tests/download-flow.test.ts tests/race-conditions.test.ts
```

Expected: all download/race tests pass.

**Step 6: Commit**

```bash
git add src/modules/downloads/service.ts tests/download-flow.test.ts tests/race-conditions.test.ts
git commit -m "fix: make failed downloads retryable before debit"
```

---

## P0 Task 4: Synchronize required environment variables and deploy checks

**Why:** Prisma validation/migration status failed because `DATABASE_URL` was missing locally. `.env.example`, docs, and deploy script must agree on required env, including `DIRECT_URL` and Pakasir webhook URL.

**Files:**
- Modify: `.env.example`
- Modify: `scripts/deploy.sh`
- Modify: `docs/production/env-checklist.md` if inconsistent
- Optional Modify: `SETUP.md`

**Step 1: Inspect Prisma env requirements**

Run:

```bash
sed -n '1,80p' prisma/schema.prisma
```

Confirm datasource requires:

```text
DATABASE_URL
DIRECT_URL
```

**Step 2: Update `.env.example`**

Add:

```env
DIRECT_URL="postgresql://user:password@localhost:5432/dokmaker?schema=public"
```

Ensure required production variables are represented:

```env
PAKASIR_WEBHOOK_URL=""
```

Already present variables should stay documented.

**Step 3: Update deploy required vars**

In `scripts/deploy.sh`, extend `REQUIRED_VARS`:

```bash
REQUIRED_VARS=(
    "DATABASE_URL"
    "DIRECT_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "APP_BASE_URL"
    "PAKASIR_PROJECT_SLUG"
    "PAKASIR_API_KEY"
    "PAKASIR_WEBHOOK_URL"
    "R2_ACCOUNT_ID"
    "R2_ACCESS_KEY_ID"
    "R2_SECRET_ACCESS_KEY"
    "R2_BUCKET_NAME"
)
```

Only include `R2_PUBLIC_URL` if production code requires it for final PDF delivery. Do not require it if final PDFs are private and streamed.

**Step 4: Add migration status to deploy verification**

After `npx prisma validate`, add:

```bash
npx prisma migrate status
```

For production, this should run before `migrate deploy` to reveal drift/history issues.

**Step 5: Run validation with local env if available**

If valid local `.env` exists, run:

```bash
set -a
source .env
set +a
npx prisma validate
npx prisma migrate status
```

Expected: pass or produce actionable database connectivity/migration output.

If env is unavailable, document as blocked and do not claim complete production readiness.

**Step 6: Commit**

```bash
git add .env.example scripts/deploy.sh docs/production/env-checklist.md SETUP.md
git commit -m "chore: align production env and deploy checks"
```

---

## P0 Task 5: Add CI workflow for release gates

**Why:** No CI workflow currently enforces lint/typecheck/tests/build/Prisma validation.

**Files:**
- Create: `.github/workflows/ci.yml`
- Optional Modify: `README.md`

**Step 1: Create GitHub Actions workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dokmaker?schema=public
      DIRECT_URL: postgresql://postgres:postgres@localhost:5432/dokmaker?schema=public
      NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
      NEXT_PUBLIC_SUPABASE_ANON_KEY: test-anon-key
      SUPABASE_SERVICE_ROLE_KEY: test-service-role-key
      APP_BASE_URL: http://localhost:3000
      PAKASIR_PROJECT_SLUG: dokmaker-test
      PAKASIR_API_KEY: test-pakasir-key
      PAKASIR_BASE_URL: https://app.pakasir.com
      PAKASIR_WEBHOOK_URL: http://localhost:3000/api/webhooks/pakasir
      R2_ACCOUNT_ID: test-account
      R2_ACCESS_KEY_ID: test-access-key
      R2_SECRET_ACCESS_KEY: test-secret
      R2_BUCKET_NAME: test-bucket
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Prisma validate
        run: npx prisma validate

      - name: Build
        run: npm run build
```

Do not put real secrets in CI YAML.

**Step 2: Validate workflow syntax locally if possible**

Run:

```bash
npm run lint
npm run typecheck
npm test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dokmaker?schema=public" DIRECT_URL="postgresql://postgres:postgres@localhost:5432/dokmaker?schema=public" npx prisma validate
npm run build
```

Expected: commands pass locally except DB-dependent migrate status, which is intentionally not in CI unless a test database service is added.

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: add verification workflow"
```

---

## P0 Task 6: Safe error responses for sensitive APIs

**Why:** Some API routes return raw `error.message`, which can expose internal configuration, storage, DB, or payment details.

**Files:**
- Modify: `src/app/api/webhooks/pakasir/route.ts`
- Modify: `src/app/api/invoices/[invoiceId]/download/route.ts`
- Modify: `src/app/api/wallet/topup/route.ts`
- Modify: `src/app/api/admin/users/[userId]/adjust/route.ts`
- Optional Create/Modify: `src/lib/errors.ts`
- Test: relevant API route tests if present, otherwise service tests plus route-level tests if easy

**Step 1: Create a small error mapper**

If no shared error helper exists, create `src/lib/errors.ts`:

```ts
export function safeApiError(error: unknown, fallback = "Internal server error") {
  if (error instanceof Error) {
    const safeMessages = [
      "Unauthorized",
      "Forbidden",
      "Invoice tidak ditemukan",
      "Versi aktif tidak ditemukan",
      "Wallet tidak ditemukan",
      "Saldo tidak mencukupi",
      "Nominal top up tidak valid",
      "Status versi tidak valid",
      "Download invoice sedang diproses atau sudah dibayar",
    ];

    if (safeMessages.some((message) => error.message.startsWith(message))) {
      return error.message;
    }
  }

  return fallback;
}
```

Keep this minimal; do not over-engineer a full error class hierarchy unless already present.

**Step 2: Update sensitive routes**

Replace raw `error.message` JSON responses for unexpected errors with `safeApiError(error)` and log the real error server-side.

**Step 3: Add tests if route tests exist**

Test that a thrown error such as `Pakasir API key not configured` returns generic `Internal server error` to client.

**Step 4: Run focused tests**

Run:

```bash
npm test -- tests/auth-guards.test.ts tests/download-flow.test.ts tests/pakasir-webhook.test.ts
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/lib/errors.ts src/app/api/webhooks/pakasir/route.ts src/app/api/invoices/[invoiceId]/download/route.ts src/app/api/wallet/topup/route.ts src/app/api/admin/users/[userId]/adjust/route.ts tests
git commit -m "fix: sanitize sensitive api errors"
```

---

## P1 Task 7: Replace or clearly gate in-memory rate limiting

**Why:** In-memory `Map` rate limiting is not production-grade on serverless/multi-instance deployments.

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Modify: `.env.example`
- Modify: `docs/production/env-checklist.md`
- Test: add/update rate-limit tests if present

**Step 1: Choose rate-limit backend**

Recommended production backend: Upstash Redis or Vercel KV.

Decision options:

- Option A: Implement Redis-backed limiter now.
- Option B: Keep in-memory for local/dev, but require `RATE_LIMIT_REDIS_URL` or equivalent in production and fail closed for sensitive endpoints.

Recommended: Option B first if launch timeline is short; Option A before public traffic.

**Step 2: Add env contract**

Add to `.env.example`:

```env
RATE_LIMIT_REDIS_URL=""
RATE_LIMIT_REDIS_TOKEN=""
```

Only if choosing Redis/Upstash.

**Step 3: Implement backend abstraction**

Keep API simple:

```ts
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>
```

Use in-memory only when `NODE_ENV !== "production"` or when explicitly allowed by env.

**Step 4: Add tests**

Test:

1. Dev mode permits in-memory limiter.
2. Production without configured distributed limiter fails closed or logs hard warning depending chosen policy.
3. Sensitive routes still call limiter.

**Step 5: Commit**

```bash
git add src/lib/rate-limit.ts .env.example docs/production/env-checklist.md tests
git commit -m "fix: gate production rate limiting"
```

---

## P1 Task 8: Add request idempotency to admin wallet adjustment

**Why:** Admin wallet adjustment currently uses `Date.now()` in idempotency key, so browser retry/double-submit can create multiple adjustments.

**Files:**
- Modify: `src/app/api/admin/users/[userId]/adjust/route.ts`
- Test: admin adjustment route test if present, otherwise add test file

**Step 1: Add failing test**

Test two identical admin adjustment requests with same idempotency key:

```http
Idempotency-Key: admin-adjust-test-1
```

Expected behavior:
- first request succeeds
- second request does not create another wallet ledger entry

**Step 2: Read idempotency key from header or body**

In route:

```ts
const idempotencyKey = request.headers.get("Idempotency-Key") || body.idempotencyKey;

if (!idempotencyKey) {
  return NextResponse.json({ error: "Idempotency key required" }, { status: 400 });
}
```

Build ledger key:

```ts
const ledgerIdempotencyKey = `admin-adjust:${admin.id}:${userId}:${idempotencyKey}`;
```

**Step 3: Run tests and commit**

```bash
npm test -- tests/authorization.test.ts tests/race-conditions.test.ts
git add src/app/api/admin/users/[userId]/adjust/route.ts tests
git commit -m "fix: require idempotency for admin wallet adjustments"
```

---

## P1 Task 9: Document Pakasir API key query-string risk and logging redaction

**Why:** If Pakasir requires `api_key` in query string, the app must explicitly avoid logging full URLs and document accepted risk.

**Files:**
- Modify: `src/lib/logger.ts`
- Modify: `docs/production/env-checklist.md`
- Test: logger test if present or add focused test

**Step 1: Add redaction helper**

In logger or helper:

```ts
export function redactSecrets(value: string) {
  return value
    .replace(/api_key=[^&\s]+/gi, "api_key=[REDACTED]")
    .replace(/PAKASIR_API_KEY=[^&\s]+/gi, "PAKASIR_API_KEY=[REDACTED]");
}
```

**Step 2: Ensure logger applies redaction**

Before writing metadata/error strings, sanitize string values recursively.

**Step 3: Document risk**

In `docs/production/env-checklist.md`, note:

- Pakasir Transaction Detail currently requires API key in query string if provider does not support auth header.
- Full fetch URLs must not be logged.
- Platform/proxy logs must be reviewed for query string capture.

**Step 4: Commit**

```bash
git add src/lib/logger.ts docs/production/env-checklist.md tests
git commit -m "chore: redact pakasir secrets in logs"
```

---

## P0 Task 10: Complete launch evidence and smoke checklist templates

**Why:** Production readiness cannot be claimed without evidence for env, deploy, smoke, Pakasir verification, duplicate webhook/download, and rollback.

**Files:**
- Modify: `docs/production/launch-evidence.md`
- Modify: `docs/production/smoke-test-report.md`
- Modify: `docs/production/production-readiness-review.md` if present and stale
- Reference: `docs/plans/2026-06-12-dokmaker-smoke-checklist.md`

**Step 1: Fill static evidence sections**

Add:

- commit SHA
- branch
- target environment
- deployment URL or `TBD`
- database environment
- storage bucket
- Pakasir mode: sandbox/live equivalent

Do not include secret values.

**Step 2: Add command evidence placeholders**

Record exact commands and results:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
npm audit --audit-level=high
```

**Step 3: Add manual smoke checklist**

Include:

1. User can sign in.
2. User can create invoice.
3. User can preview watermarked invoice.
4. User can top up Rp50.000 or Rp100.000 through Pakasir test flow.
5. Duplicate Pakasir webhook does not double-credit.
6. User can download final PDF after wallet debit.
7. Duplicate same-version download is free.
8. Edited paid invoice creates unpaid new version.
9. User cannot access another user's invoice/download.
10. Admin route rejects non-admin.
11. Final PDF URL is not public permanent URL.
12. PWA offline does not expose private data.

**Step 4: Commit documentation**

```bash
git add docs/production/launch-evidence.md docs/production/smoke-test-report.md docs/production/production-readiness-review.md
git commit -m "docs: prepare production launch evidence checklist"
```

---

## Final Verification Gate

Run all required checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
npm audit --audit-level=high
```

Expected:

- lint passes
- typecheck passes
- all tests pass
- build passes
- Prisma validate passes with configured env
- Prisma migrate status confirms migrations are in sync or gives accepted deploy plan
- npm audit has no high/critical vulnerabilities; moderate advisories are documented with upgrade plan

If any command fails, stop and fix before production claims.

---

## Production Release Decision Criteria

The app may be called production-ready only when all are true:

- P0 Tasks 1-6 and 10 are complete.
- Focused payment/download/authz race tests pass.
- Full verification gate passes.
- Pakasir sandbox/live-equivalent transaction detail verification is tested.
- Duplicate webhook does not double-credit wallet.
- Duplicate same-version download does not double-debit wallet.
- Authz/data isolation tests pass.
- Env/secrets are configured without exposing server secrets to client bundles.
- Final PDFs are private and delivered through authorized backend route only.
- Rollback/forward-fix plan is documented.
- Launch evidence and smoke report are filled with real results.

---

## Suggested Execution Order

1. P0 Task 1 — Pakasir verification completeness.
2. P0 Task 2 — Pakasir idempotency/race hardening.
3. P0 Task 3 — Download retry/recovery.
4. P0 Task 6 — Safe API errors.
5. P0 Task 4 — Env/deploy consistency.
6. P0 Task 5 — CI workflow.
7. P1 Task 8 — Admin adjustment idempotency.
8. P1 Task 9 — Secret redaction/docs.
9. P1 Task 7 — Distributed/gated rate limiting.
10. P0 Task 10 — Launch evidence.
11. Final verification gate.

---

## Residual Risks After This Plan

- Real Pakasir behavior still requires sandbox/live-equivalent verification with actual provider responses.
- Distributed rate limiting requires infrastructure choice and credentials.
- PWA offline behavior still needs browser-level smoke/E2E validation.
- Security headers/CSP review is not fully covered here and should be a separate hardening pass.
