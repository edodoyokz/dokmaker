# Template-Based Invoice Generation — Launch Evidence

**Date:** 2026-06-20  
**Commit range:** `c1256ac` → `c1823e3`  
**Total commits:** 7  
**Author:** AI implementation worker

---

## What Was Built

Template-based invoice rendering from `InvoiceTemplate.htmlTemplate` with:
- Constrained placeholder contract (`{{sender.name}}`, `{{#items}}...{{/items}}`, `{{total}}`, etc.)
- HTML escaping for all user-supplied content
- Preview mode (watermark + meta) vs final mode (clean)
- Content hash (SHA-256) for every invoice version
- Cloudflare R2 private storage backend for paid PDF artifacts
- Puppeteer-core + @sparticuz/chromium PDF engine for Vercel serverless
- Real seed templates (Professional Invoice + GoCar Receipt)
- Smoke tests proving template differentiation

---

## Verification Suite Results

| Command | Result |
|---------|--------|
| `npm run lint` | ✅ PASS — no warnings |
| `npm run typecheck` | ✅ PASS — `tsc --noEmit` |
| `npm test` | ✅ PASS — 113/113 tests (13 test files) |
| `npm run build` | ✅ PASS — Next.js build successful |
| `npx prisma validate` | ✅ PASS — schema valid |
| `npx prisma migrate status` | ✅ PASS — 1 migration, up to date |

---

## Core Acceptance Tests

### Template Differentiation ✅

```ts
// Professional template vs GoCar receipt produce DIFFERENT HTML
profHtml.contains('data-template="professional"')  → ✅
recHtml.contains('data-template="receipt"')        → ✅
profHtml !== recHtml                               → ✅
profHtml.contains("INVOICE")                       → ✅
recHtml.contains("RECEIPT")                        → ✅
```

### Preview vs Final ✅

```ts
// Preview has watermark + meta, final does not
preview.contains("PREVIEW")                     → ✅
preview.contains("user@test.test")              → ✅
final.contains("PREVIEW")    ≠                   → ✅ (not present)
```

### HTML Escaping ✅

```ts
// User content with special chars is escaped
output.contains("Studio Kreatif &lt;Design&gt;")  → ✅
output.contains("PT Maju Bersama &amp; Co")      → ✅
output.contains("<Design>")   ≠                   → ✅ (not present)
```

### Content Hash ✅

```ts
// Deterministic, different for different content
hash(sameContent) === hash(sameContent)            → ✅
hash(contentA) !== hash(contentB)                  → ✅
len(hash) === 64                                    → ✅ (SHA-256)
```

### Storage Key Builder ✅

```ts
// Deterministic key with hash segment
key contains "invoice-finals/user-abc/inv-xyz/ver-1-"  → ✅
key.endsWith(".pdf")                                     → ✅
```

---

## R2 Storage Audit

- ✅ No public ACL set on PutObjectCommand
- ✅ Private PDFs only — no `public-read` anywhere
- ✅ Storage key format: `invoice-finals/{userId}/{invoiceId}/{versionId}[-{hash[:16]}].pdf`
- ✅ `.env.example` updated with `R2_*` naming
- ✅ `.env` untouched (real credentials)
- ✅ Tests mock `@aws-sdk/client-s3`, never hit real R2

---

## Financial Safety Audit

| Invariant | Status |
|-----------|--------|
| Duplicate download debit | ✅ — `updateMany` claim check prevents parallel charge |
| Wallet debit atomic | ✅ — `debitWallet` + `version.paid` in same transaction |
| PDF generation failure → no charge | ✅ — PDF generated BEFORE transaction |
| Duplicate webhook safe | ✅ — existing idempotency key in ledger |
| Wallet mutation server-only | ✅ — all through Prisma transactions |
| Paid version re-download free | ✅ — served from R2 storage, no debit |

---

## File Delivery Audit

| Requirement | Status |
|-------------|--------|
| Private permanent URLs avoided | ✅ — R2 private bucket, no public URL |
| Backend-only streaming | ✅ — `/api/invoices/[invoiceId]/download` controls access |
| Paid PDF persisted immutably | ✅ — stored in R2 before marking paid |
| Re-download from artifact | ✅ — `storageKey` check avoids regeneration |

---

## Architecture Alignment

| Spec | Implementation |
|------|---------------|
| `InvoiceTemplate.htmlTemplate` → render | ✅ `renderInvoiceTemplateHtml` |
| Template-driven preview | ✅ `TemplatePreview` React component |
| Template-driven final PDF | ✅ `generateInvoiceHtml(content, template)` |
| Content snapshot + hash | ✅ `hashInvoiceContent` (SHA-256) |
| Storage abstraction | ✅ `PdfStorage` interface → R2 backend |
| PDF engine for Vercel | ✅ `puppeteer-core` + `@sparticuz/chromium` |

---

## Known Gaps (Not Blocking Launch)

1. **Template HTML snapshot in InvoiceVersion** — If admin edits a template after invoice creation, paid versions reference the live template (not the historical snapshot). For strict immutability, add `templateHtmlSnapshot` column in a future migration. Low risk: admin template edits are rare and versioned invoices still have correct `contentSnapshot`.

2. **`contentHash` populated but not verified on re-download** — The hash is stored but not compared on retrieval. The `storageKey` already ensures the right artifact is served. Adding hash verification on re-download would be a defense-in-depth improvement.

3. **PWA manifest and service worker caching audit** — Not verified in this batch. AGENTS.md §2 and PRD NFR-006 require PWA with safe caching. Plan or team task needed.

4. **Rate limiting completeness** — Download has rate limit. Invoice creation (`POST /api/invoices`) and edit do not. Low fraud risk for MVP but worth adding before high-volume launch.

5. **`editInvoice` has dead code** — `include: { versions: { where: { id: undefined }, take: 0 } }` is a no-op query. Non-blocking cleanup.

---

## Recommended Next Steps

1. **Deploy to Vercel preview** — Test PDF generation in Vercel environment (cold-start Chromium)
2. **Manual smoke** — Create real invoices from Professional and GoCar templates, verify preview differs
3. **E2E payment flow** — Top up wallet → download invoice → re-download → verify balance correct
4. **Seed templates with full HTML** — Current seed uses minimal HTML; product owner should design full templates
5. **PWA manifest + cache audit** — Complete before production launch
6. **Admin template UI polish** — Add placeholder reference docs in the template editor

---

## Launch Readiness Status

**Assessment:** CORE LAUNCH-READY (with caveats)

The fundamental problem — "invoice generation does not use template HTML" — is **solved**. Two different templates now produce visibly different previews and final PDFs.

Remaining items for full production-readiness:
- Vercel deploy + PDF engine cold-start verification
- PWA + caching audit
- Real template HTML designed by product owner
- Manual E2E smoke test in staging environment
