# Code Context — DokMaker Full-Stack Architecture

## Files Retrieved

### Database / Prisma
1. `prisma/schema.prisma` (lines 1-226) — All 8 models, 6 enums, indexes, unique constraints, foreign keys
2. `prisma/migrations/20260612042147_init_dokmaker/migration.sql` — Full initial schema
3. `prisma/migrations/20260620223921_add_document_types/migration.sql` — Added `document_type` column to `invoice_templates` and `invoices`, `title` to invoices
4. `prisma/seed.ts` — Seeds admin + test user + 3 templates (2 active, 1 inactive)

### Auth / Middleware
5. `middleware.ts` — Next.js middleware delegating to `lib/supabase/middleware`
6. `src/lib/supabase/middleware.ts` — Creates Supabase SSR client, redirects unauthenticated users on `/app` and `/admin`
7. `src/lib/supabase/server.ts` — Server Supabase client factory
8. `src/lib/supabase/client.ts` — Browser Supabase client factory
9. `src/modules/auth/session.ts` — `requireUser()`, `requireAdmin()`, `getCurrentUser()`, `syncLocalUser()` with race-condition P2002 recovery
10. `src/modules/auth/index.ts` — Re-exports

### API Routes
11. `src/app/api/invoices/route.ts` — POST: create invoice draft
12. `src/app/api/invoices/[invoiceId]/route.ts` — PATCH: edit invoice (no GET route for fetching single invoice)
13. `src/app/api/invoices/[invoiceId]/download/route.ts` — GET: process download (paid/unpaid/rate-limited)
14. `src/app/api/wallet/topup/route.ts` — POST: create top-up payment via Pakasir
15. `src/app/api/webhooks/pakasir/route.ts` — POST: handle Pakasir webhook
16. `src/app/api/admin/templates/route.ts` — POST: create template (admin)
17. `src/app/api/admin/templates/[templateId]/route.ts` — PATCH: update template status (admin)
18. `src/app/api/admin/users/[userId]/adjust/route.ts` — POST: adjust wallet balance (admin)

### Service Modules
19. `src/modules/invoices/service.ts` — `createInvoice`, `editInvoice`, `getInvoice`, `listInvoices` — handles versioning rules
20. `src/modules/invoices/content-hash.ts` — SHA-256 deterministic hashing with stable JSON sort
21. `src/modules/invoices/invoice-content.schema.ts` — Zod schema for classic invoices
22. `src/modules/invoices/invoice-render-context.ts` — Maps invoice content to template placeholder values
23. `src/modules/downloads/service.ts` — `processDownload` — core financial flow (debit wallet, generate PDF, persist)
24. `src/modules/downloads/pdf-storage.ts` — R2 wrapper (`put`/`get`), storage key builder
25. `src/modules/downloads/index.ts` — Re-exports
26. `src/modules/payments/pakasir.ts` — `createTopUpPayment`, `handlePakasirWebhook` — payment + webhook verification
27. `src/modules/payments/index.ts` — Re-exports
28. `src/modules/wallet/service.ts` — `creditWallet`, `debitWallet`, `getWallet`, `getLedgerEntries` — atomic ledger operations
29. `src/modules/wallet/index.ts` — Re-exports
30. `src/modules/pricing/constants.ts` — `FINAL_DOWNLOAD_PRICE = 10000`, `ALLOWED_TOPUP_AMOUNTS = [50000, 100000]`
31. `src/modules/admin/index.ts` — Re-exports prisma
32. `src/modules/audit/index.ts` — Re-exports prisma
33. `src/modules/users/index.ts` — Re-exports prisma
34. `src/modules/templates/index.ts` — Re-exports prisma
35. `src/modules/templates/render-template.ts` — Template engine: placeholder substitution, `{{#items}}...{{/items}}` block rendering, preview watermark injection
36. `src/modules/templates/render-utils.ts` — `escapeHtml`, `formatRupiah`
37. `src/modules/documents/types.ts` — `DocumentType` type: `"invoice" | "gocar_receipt"`, generic `DocumentTypeDefinition<TContent>`
38. `src/modules/documents/document-type-registry.ts` — Registry of supported document types with runtime definition builder
39. `src/modules/documents/default-content.ts` — Default content factories
40. `src/modules/documents/gocar-receipt-content.schema.ts` — Zod schema for GoCar receipt content
41. `src/modules/documents/gocar-receipt-render-context.ts` — GoCar receipt template placeholder builder
42. `src/modules/documents/gocar-receipt-template.ts` — Two-page HTML template for GoCar receipt

### Library Files
43. `src/lib/db/prisma.ts` — Singleton PrismaClient
44. `src/lib/pdf/generator.ts` — `generateInvoiceHtml`, `generateInvoicePdf` — Puppeteer/Playwright HTML-to-PDF
45. `src/lib/rate-limit.ts` — In-memory rate limiter with `checkRateLimit`, `getRateLimitKey`, predefined `RATE_LIMITS`
46. `src/lib/logger.ts` — Structured logger with categories (auth, payment, wallet, invoice, pdf, admin, webhook, download)
47. `src/lib/utils.ts` — `cn()` utility

### Tests
48. `tests/download-flow.test.ts` — 10 tests: insufficient balance, PDF failure, free re-download, version status checks, transactional debit, idempotency, template forwarding, storage key persistence, migration safety
49. `tests/pakasir-webhook.test.ts` — 8 tests: project slug, payment not found, amount mismatch, API key missing, status not completed, fetch failure, already_processed, successful credit
50. `tests/authorization.test.ts` — Conceptual route protection and data isolation rule checks
51. `tests/race-conditions.test.ts` — Conceptual tests for duplicate webhook, concurrent download, wallet consistency, payment state machine, version locking
52. `tests/auth-guards.test.ts` — Conceptual auth guard rules (requireUser, requireAdmin, route protection, user sync)
53. `tests/auth-sync.test.ts` — 4 tests: user+wallet creation, P2002 race recovery, non-P2002 error rethrow, existing user skip
54. `tests/invoice-versioning.test.ts` — Conceptual version creation and edit rules
55. `tests/pdf-generation.test.ts` — 6 tests: HTML rendering, template variation, GoCar receipt, PDF generation with mock engine, engine failure
56. `tests/pdf-storage.test.ts` — 5 tests: storage key builder, put/get, NoSuchKey handling, missing env vars
57. `tests/invoice-content-hash.test.ts` — See related
58. `tests/invoice-schema.test.ts` — See related
59. `tests/template-rendering.test.ts` — See related
60. `tests/gocar-receipt-schema.test.ts` — See related
61. `tests/gocar-receipt-rendering.test.ts` — See related
62. `tests/pricing.test.ts` — See related
63. `tests/smoke.test.ts` — Launch smoke tests (template differentiation, content hashing, schema, storage keys, PDF generation)
64. `tests/document-service.test.ts` — See related
65. `tests/document-type-registry.test.ts` — See related

### Config / Deployment
66. `package.json` — Next.js 16, React 19, Prisma 6, Supabase, Puppeteer-core, AWS SDK S3, Zod 4, shadcn/ui
67. `vitest.config.ts` — Test config with `@/` alias, node environment
68. `next.config.ts` — Empty default
69. `.env.example` — 13 env vars (DATABASE_URL, NEXT_PUBLIC_SUPABASE_*, PAKASIR_*, R2_*)
70. `.env` — Live Supabase and R2 credentials present (production-connected)
71. `prisma.config.ts` — Prisma config with migration path and classic engine

---

## Key Code

### Financial Safety: Download Flow (most critical code in the system)

**File:** `src/modules/downloads/service.ts` (lines 80-173)

```typescript
// Unpaid version download
if (activeVersion.status === "unpaid") {
  // 1. Check balance BEFORE any mutation
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (wallet.currentBalance < FINAL_DOWNLOAD_PRICE) throw new Error("Insufficient");

  // 2. Optimistic claim via atomic updateMany with status filter
  const claim = await prisma.invoiceVersion.updateMany({
    where: { id: activeVersion.id, status: "unpaid" },
    data: { status: "processing_payment" },
  });
  if (claim.count !== 1) throw new Error("Already paid or processing");

  // 3. Generate PDF BEFORE financial transaction
  pdf = await generateInvoicePdf(content, { template: {...} });

  // 4. Persist artifact BEFORE financial transaction
  await pdfStorage.put(storageKey, pdf);

  // 5. Atomic debit + version+status in single transaction
  await prisma.$transaction(async (tx) => {
    await debitWallet(tx, userId, FINAL_DOWNLOAD_PRICE, "download_debit", 
      `download:${invoiceId}:${activeVersion.versionNumber}`, ...);
    await tx.invoiceVersion.update({ where: { id: activeVersion.id },
      data: { status: "paid", paidAt: new Date(), storageKey } });
    await tx.downloadLog.create({ ... });
  });
}
```

### Financial Safety: Wallet Service (atomic debit with balance guard)

**File:** `src/modules/wallet/service.ts` (lines 92-140)

```typescript
export async function debitWallet(tx, userId, amount, entryType, idempotencyKey, ...) {
  // 1. Idempotency check
  const existing = await tx.walletLedgerEntry.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  // 2. Atomic balance guard: only decrement if enough balance
  const debitResult = await tx.wallet.updateMany({
    where: { id: wallet.id, currentBalance: { gte: amount } },
    data: { currentBalance: { decrement: amount } },
  });
  if (debitResult.count !== 1) throw new Error("Saldo tidak mencukupi");

  // 3. Append-only ledger entry
  const entry = await tx.walletLedgerEntry.create({ data: { ..., idempotencyKey, ... } });
  return entry;
}
```

### Financial Safety: Webhook Verification (outbound API verification)

**File:** `src/modules/payments/pakasir.ts` (lines 77-152)

```typescript
export async function handlePakasirWebhook(body) {
  // 1. Verify project slug
  if (project !== process.env.PAKASIR_PROJECT_SLUG) throw new Error("Slug mismatch");
  
  // 2. Find payment transaction by providerOrderId
  const payment = await prisma.paymentTransaction.findFirst({ where: { providerOrderId: order_id } });
  if (!payment) throw new Error("Not found");
  if (payment.status === "success") return { status: "already_processed" };
  if (payment.amount !== amount) throw new Error("Amount mismatch");

  // 3. Verify with Pakasir Transaction Detail API (OUTBOUND)
  const detailResponse = await fetch(`${baseUrl}/api/transactiondetail?...&api_key=${apiKey}`);
  if (!detailResponse.ok) throw new Error("Verification failed");
  const detail = await detailResponse.json();
  if (detail.status !== "completed") throw new Error("Not completed");

  // 4. Atomic credit inside transaction
  await prisma.$transaction(async (tx) => {
    await creditWallet(tx, payment.userId, amount, "topup_credit", 
      `pakasir:${order_id}`, "payment_transaction", payment.id, ...);
    // + update payment status + log webhook event
  });
}
```

### Authorization: requireUser + requireAdmin

**File:** `src/modules/auth/session.ts` (lines 19-78)

```typescript
export async function requireUser(): Promise<AuthUser> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  const localUser = await syncLocalUser(user.id, user.email!, user.user_metadata);
  return { id: localUser.id, email: localUser.email, role: localUser.role };
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}
```

### Invoice Versioning

**File:** `src/modules/invoices/service.ts` (lines 108-155)

- **Unpaid active version:** content is overwritten in-place
- **Paid active version:** a new `InvoiceVersion` is created with `versionNumber = max + 1`, set as active, old paid version remains as immutable artifact
- Invoice status transitions: `draft -> active` on creation, never goes back

### Data Ownership Enforcement

All service functions filter by `userId`:
- `prisma.invoice.findUnique({ where: { id: invoiceId, userId } })` (createInvoice, editInvoice, getInvoice, listInvoices)
- `prisma.invoice.findUnique({ where: { id: invoiceId, userId } })` in download service
- Wallet queries use `where: { userId }`
- Download logs use `where: { userId }` in create

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Middleware                        │
│  (Supabase SSR session check; redirects if          │
│   unauthenticated on /app and /admin)                │
├─────────────────────────────────────────────────────┤
│                    API Routes                        │
│                                                      │
│  POST  /api/invoices                     → create   │
│  PATCH /api/invoices/:id                → edit      │
│  GET   /api/invoices/:id/download       → download  │
│  POST  /api/wallet/topup                → topup     │
│  POST  /api/webhooks/pakasir            → webhook   │
│  POST  /api/admin/templates             → admin CRD │
│  PATCH /api/admin/templates/:id         → admin CRD │
│  POST  /api/admin/users/:id/adjust      → admin     │
├─────────────────────────────────────────────────────┤
│              Server Components (Pages)               │
│  /app/* pages     — call prisma directly via         │
│                     requireUser                      │
│  /admin/* pages   — call prisma directly via         │
│                     requireAdmin                     │
├─────────────────────────────────────────────────────┤
│                  Service Modules                     │
│                                                      │
│  auth/session    → Supabase + user sync + wallet     │
│  invoices/       → CRUD + versioning                 │
│  downloads/      → PDF gen + storage + wallet debit  │
│  payments/       → Pakasir integration + webhook     │
│  wallet/         → atomic credit/debit + ledger      │
│  templates/      → template rendering engine         │
│  documents/      → document-type registry + schemas  │
│  pricing/        → constant definitions              │
├─────────────────────────────────────────────────────┤
│                    Library                           │
│  lib/db/prisma      → PrismaClient singleton         │
│  lib/supabase/*     → Supabase SSR client factories  │
│  lib/pdf/generator  → Puppeteer HTML-to-PDF          │
│  lib/rate-limit     → In-memory rate limiter         │
│  lib/logger         → Structured logger              │
├─────────────────────────────────────────────────────┤
│                   Database (PostgreSQL)              │
│                                                      │
│  users → wallets (1:1) → wallet_ledger_entries      │
│       → invoices → invoice_versions → download_logs │
│       → payment_transactions → payment_webhook_events│
│       → admin_audit_logs                             │
│  invoice_templates → invoices                        │
└─────────────────────────────────────────────────────┘
```

### Data Flow: Payment Top-up
```
User clicks topup → POST /api/wallet/topup
  → requireUser() → check ALLOWED_TOPUP_AMOUNTS
  → create PaymentTransaction (status=created)
  → return { paymentId, redirectUrl } (Pakasir payment page URL)

User pays on Pakasir → Pakasir sends webhook → POST /api/webhooks/pakasir
  → check project slug
  → find PaymentTransaction by providerOrderId
  → verify amount matches
  → verify status via Pakasir Transaction Detail API (outbound call)
  → atomic transaction: mark payment success, creditWallet with idempotency key
```

### Data Flow: Invoice Download
```
User clicks download → GET /api/invoices/:id/download
  → requireUser() → rate limit check
  → processDownload(userId, invoiceId):
    → find invoice with ownership check (userId)
    → if paid: free re-download (read from R2 or regenerate)
    → if unpaid:
      1. check balance
      2. atomic claim via updateMany(status=unpaid → processing_payment)
      3. generate PDF
      4. persist to R2
      5. atomic transaction: debitWallet + mark paid + downloadLog
```

---

## Attack Surface / Audit Concerns

### Critical (Financial Safety)
1. **R2 credentials in `.env` file** — `R2_SECRET_ACCESS_KEY` and `PAKASIR_API_KEY` are stored in plaintext in `.env` which is checked into the repository. This is a **severe security risk**.
2. **In-memory rate limiter** — `rate-limit.ts` uses a `Map<string, {...}>`. In-memory rate limiting is reset on every server restart and doesn't scale across multiple instances. Should use Redis.
3. **Pakasir API key in webhook code** — The key is passed as a query parameter to the Pakasir verification endpoint (`?api_key=${apiKey}`). If the webhook handler ever logs the request URL, the API key could leak into logs.
4. **No nonce/CSRF for API routes** — No CSRF protection on state-changing API endpoints (POST/PATCH).
5. **No input size limits** — `content` and `htmlTemplate` fields have no max-length validation in Zod schemas or API validation. An attacker could submit a multi-megabyte template or content block, causing DoS on PDF generation.
6. **`processing_payment` could get stuck** — If a download is claimed (status → processing_payment) but the process crashes before completing, the version is stuck indefinitely. No timeout recovery mechanism exists.
7. **No distributed lock on `updateMany` claim** — The optimistic claim via `updateMany(status=unpaid)` is safe at the database level, but across multiple instances of the app, the check for `claim.count !== 1` works correctly since it's a single SQL update.

### Authorization
8. **Middleware admin check is a TODO** — In `src/lib/supabase/middleware.ts` line ~36: the admin role check is a comment `// We'll check admin role in server components/actions instead`. This means unauthenticated requests to `/admin` pages are caught by middleware, but authenticated non-admin users could access admin pages until the server component's `requireAdmin()` runs. Server components do call `requireAdmin()`, but there is a brief window where the page starts rendering before the throw.
9. **No GET routes for listing invoices via API** — Listing is done directly in server components via Prisma, bypassing API routes. While this works with ownership checks, it means all listing logic happens in page components rather than reusable API handlers.

### Configuration/Secret Management
10. **Live credentials in `.env`** — The `.env` file contains live Supabase credentials, R2 credentials, and a Pakasir API key. If `.env` is accidentally served or leaked through a CI artifact, it's a full credential compromise.
11. **`NODE_ENV` missing** — `next.config.ts` is empty. There's no explicit `NODE_ENV` being set.

### Data Integrity
12. **`walletLedgerEntry.idempotency_key` is unique** — This prevents duplicate credits/debits. However, the `creditWallet` and `debitWallet` functions check idempotency first but generate the key at the call site. The callers must consistently generate the same key for retries. In `download/service.ts`, the key is `download:${invoiceId}:${activeVersion.versionNumber}` — this is deterministic, so retrying the same download after a crash would return the existing ledger entry. But the rest of the transaction (version update, download log) would also run again since they're inside the `$transaction`. Let me check: The `debitWallet` returns existing entry without error, so the transaction continues and would try to update the invoice version again. This should be safe because the version update would be idempotent (setting status=paid again) and the download log would be a duplicate insert. However, the `downloadLog.create` has no unique constraint to prevent duplicates on re-download.

13. **Download log has no idempotency constraint** — `downloadLog.create` has no uniqueness constraint. If the transaction succeeds partially (e.g., PDF stored, wallet debited, but crash before version update), a retry could create duplicate download log entries. The version would still be `processing_payment` (if update failed) or `paid` (if update succeeded but log failed).

### Template Injection
14. **`htmlTemplate` is stored as-is and rendered with user content** — While `escapeHtml` is used for user-provided content placeholders, the template itself is admin-controlled (stored in `invoice_templates`). However, if an admin account is compromised, arbitrary HTML/JS could be injected into generated PDFs.

### Other
15. **No separate webhook secret verification** — The Pakasir webhook only verifies `project`, `order_id`, and `amount` from the body, then does an outbound API call for confirmation. There's no webhook signature verification (e.g., HMAC). The `api_key` field from the webhook body is received in `body.api_key` but never verified — it's unused in the handler.
16. **No Gocar receipt download flow test** — The download tests have one test for GoCar title, but no test verifying the full unpaid → paid flow with GoCar receipt content.
17. **No integration tests requiring database** — All tests mock `@/lib/db/prisma`. There are no true integration tests that exercise the database.

---

## Start Here

For an auditor or new developer, start with:

1. **`src/modules/downloads/service.ts`** — The most critical financial flow (wallet debit + PDF delivery). Understand the order of operations and atomicity guarantees.

2. **`src/modules/payments/pakasir.ts`** — The webhook handler. Verify that the outbound API verification and idempotency checks prevent double-credit.

3. **`src/modules/wallet/service.ts`** — The atomic `creditWallet`/`debitWallet` functions with idempotency and balance guards.

4. **`src/modules/auth/session.ts`** — The `requireUser`/`requireAdmin` guards and the user sync logic.

5. **`tests/download-flow.test.ts`** and **`tests/pakasir-webhook.test.ts`** — The most comprehensive tests covering the critical financial invariants.

---

## Key Risks Summary

| Risk | Severity | File(s) | Mitigation |
|------|----------|---------|------------|
| Plaintext .env credentials in repo | **CRITICAL** | `.env` | Use .env.local, add to .gitignore |
| In-memory rate limiter not distributed | **MEDIUM** | `lib/rate-limit.ts` | Replace with Redis |
| processing_payment stuck on crash | **MEDIUM** | `downloads/service.ts` | Add TTL/cron job to retry expired claims |
| No input size limits | **LOW-MEDIUM** | API routes, Zod schemas | Add maxLength to schemas |
| Download log duplicate unbounded | **LOW** | `downloads/service.ts` | Add unique constraint or idempotency key |
| No webhook HMAC/signature | **LOW** | `payments/pakasir.ts` | Add if Pakasir provides signing |
| Middleware admin check skips role | **LOW** | `supabase/middleware.ts` | Acceptable — server component catches it |
| No integration tests | **LOW** | All tests | Add real DB integration tests before prod |
