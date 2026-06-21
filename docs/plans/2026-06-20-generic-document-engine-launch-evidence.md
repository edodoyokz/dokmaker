# Generic Document Engine — Launch Evidence

> Evidence captured after completing Tasks 1–8 and 10 of
> `docs/plans/2026-06-20-generic-document-engine-implementation-plan.md`.
> Task 9 (full Prisma model rename from `Invoice*` to `Document*`) was deferred
> as an optional cleanup because no production data exists and the user-visible
> feature is already functional.

---

## Branch & Commit

- **Branch:** `main`
- **Evidence commit:** `0b9381b637b9cce904abec3233dee9e7af3dbc2d`
- **Date:** 2026-06-21

---

## Summary of Changes

DokMaker now supports two document types through the same financially-safe
pipeline:

1. **`invoice`** — classic itemized invoice (existing flow).
2. **`gocar_receipt`** — editable two-page GoCar receipt based on the supplied
   reference screenshots.

The implementation is registry-based: each document type owns a Zod schema,
default content, render context, and form fields. The server determines the
document type from the selected template; the client never sends `documentType`.

Existing `/app/invoices/*` and `/api/invoices/*` routes remain functional. New
`/app/documents/*` and `/api/documents/*` routes were added as the generic
aliases/wrappers.

---

## Changed Files by Domain

### Document type registry & schemas
- `src/modules/documents/types.ts`
- `src/modules/documents/document-type-registry.ts`
- `src/modules/documents/default-content.ts`
- `src/modules/documents/gocar-receipt-content.schema.ts`
- `src/modules/documents/gocar-receipt-render-context.ts`
- `src/modules/documents/gocar-receipt-template.ts`

### Template rendering
- `src/modules/templates/render-utils.ts`
- `src/modules/templates/render-template.ts`
- `src/modules/invoices/invoice-render-context.ts`

### Service / PDF / download
- `src/modules/invoices/service.ts`
- `src/lib/pdf/generator.ts`
- `src/modules/downloads/service.ts`
- `src/components/invoices/template-preview.tsx`
- `src/app/app/invoices/[invoiceId]/preview/page.tsx`

### Database & seed
- `prisma/schema.prisma` — added `documentType` to `InvoiceTemplate` and
  `Invoice`, plus `title` on `Invoice`
- `prisma/seed.ts` — seeds the two-page GoCar receipt template

### UI forms
- `src/components/documents/invoice-form-fields.tsx`
- `src/components/documents/gocar-receipt-form-fields.tsx`
- `src/components/documents/document-create-form.tsx`
- `src/app/app/invoices/new/page.tsx` — now a server component that selects the
  correct default content by template type
- `src/app/app/invoices/[invoiceId]/edit/page.tsx`
- `src/app/app/invoices/[invoiceId]/edit/edit-form.tsx`

### Generic document routes (with invoice aliases preserved)
- `src/app/app/documents/page.tsx`
- `src/app/app/documents/new/page.tsx`
- `src/app/app/documents/[documentId]/edit/page.tsx`
- `src/app/app/documents/[documentId]/preview/page.tsx`
- `src/app/api/documents/route.ts`
- `src/app/api/documents/[documentId]/route.ts`
- `src/app/api/documents/[documentId]/download/route.ts`

### Tests
- `tests/document-type-registry.test.ts`
- `tests/gocar-receipt-schema.test.ts`
- `tests/gocar-receipt-rendering.test.ts`
- `tests/document-service.test.ts`
- `tests/gocar-form-fields.test.ts`
- Updated: `tests/template-rendering.test.ts`, `tests/pdf-generation.test.ts`,
  `tests/download-flow.test.ts`

---

## Verification Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

### Results

| Command | Result |
|--------|--------|
| `npm run lint` | ✅ clean |
| `npm run typecheck` | ✅ no errors |
| `npm test` | ✅ 23 files, 174 tests passed |
| `npm run build` | ✅ success |
| `npx prisma validate` | ✅ schema valid |
| `npx prisma migrate status` | ✅ 3 migrations, database schema up to date |

Build output shows the new routes registered:

```
ƒ /api/documents
ƒ /api/documents/[documentId]
ƒ /api/documents/[documentId]/download
ƒ /app/documents
ƒ /app/documents/[documentId]/edit
ƒ /app/documents/[documentId]/preview
ƒ /app/documents/new
```

---

## Financial Safety Review

No client-side wallet mutation was introduced.

The only changes touching the paid-download flow are:

- `src/modules/downloads/service.ts` now reads `template.documentType` and passes
  it to the PDF generator so the correct render context is used.
- The final PDF filename fallback uses `title || invoiceNumber || invoice.id` so
  GoCar receipts (which have no invoice number) still get a unique filename.

The core invariants remain intact:

- Wallet debit, version status update to `paid`, `storageKey` persistence, and
  download log insert remain inside a single Prisma `$transaction`.
- The optimistic `updateMany(status: "unpaid" → "processing_payment")` claim
  prevents concurrent double-debit.
- Same paid version re-download reads the persisted R2 artifact and does not
  debit again.
- Failed downloads before the debit transaction reset status back to `unpaid`;
  post-debit failures mark `generation_failed`.

---

## Manual Smoke Steps (must still be executed on Vercel / real environment)

1. Navigate to `/app/templates` and select an **Invoice** template.
2. Fill the invoice form at `/app/invoices/new?templateId=...`, save, preview,
   and download the final PDF.
3. Select a **GoCar Receipt** template.
4. Fill all GoCar receipt fields, save, preview (watermark visible), and buy
   download. Verify the final PDF is two pages (receipt + faktur).
5. Re-download the same paid GoCar version and confirm it is free.
6. Edit the paid GoCar document and confirm a new unpaid version is created.
7. Download the new version and confirm Rp10.000 is debited exactly once.
8. Attempt to access another user's document/download URL and confirm 401/404.
9. Verify `/app/documents` and `/app/documents/[id]/preview` work as aliases.
10. Confirm final PDF is served only through the authenticated backend route, not
    a public permanent URL.

---

## Residual Risks

- **Invoice-specific naming remains.** Prisma models, table names, and some file
  paths still say `Invoice*` because Task 9 (full rename to `Document*`) was
  deferred. This is tech debt but does not affect runtime behavior.
- **No automated UI/E2E tests.** The GoCar form was verified with schema
  roundtrip tests and build-time type checking, but no browser-level E2E
  coverage exists yet.
- **Mobile UX for GoCar form.** The form has many fields; a follow-up UX pass
  may be needed for 360 px viewports.
- **Vercel cold-start PDF engine.** `puppeteer-core` + `@sparticuz/chromium`
  still needs a real Vercel smoke run.
- **Pakasir integration.** Webhook and top-up flows still require sandbox/live
  verification with real provider responses (covered in the separate production
  audit remediation plan).

---

## Production Readiness Statement

The generic document engine feature (invoice + GoCar receipt) is **code-complete
and automated-verification-passed**, but **not yet production-ready** until the
manual smoke steps above are executed on the real deployment and the residual
risks are addressed or accepted.
