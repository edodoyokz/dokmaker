# DokMaker — Launch-Ready Production Webapp

Build DokMaker from scratch into a production-ready mobile-first PWA for invoice generation with wallet deposit, Pakasir payment, and paid PDF downloads.

## Goals
- Complete MVP end-to-end: auth → templates → invoices → preview → wallet → payments → downloads → admin
- All financial operations are safe, idempotent, and server-side only
- All user data access is authorized and ownership-validated
- Final PDF delivery is secure (no public permanent URLs)
- Preview is watermarked and protected
- Pakasir webhook verification is complete (local match + Transaction Detail API)
- All verification commands pass: lint, typecheck, test, build, prisma validate
- Smoke checklist completed with evidence
- Production deployment is live with rollback plan

## Checklist

### Phase 0: Repo Bootstrap
- [x] Initialize git repo
- [x] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui
- [x] Add scripts: dev, build, start, lint, typecheck, test
- [x] Add .env.example with all required env categories
- [x] Add baseline linting and test config
- [x] Verify: `npm run lint && npm run typecheck && npm run build`

### Phase 1: Database & Domain Skeleton
- [x] Add Prisma with PostgreSQL
- [x] Implement full schema (users, wallets, wallet_ledger_entries, payment_transactions, payment_webhook_events, invoice_templates, invoices, invoice_versions, download_logs, admin_audit_logs)
- [x] Add enums, relationships, indexes, unique constraints
- [x] Run migration: `npx prisma validate && npx prisma migrate dev --name init_dokmaker`
- [x] Add seed data (admin user, test user, active template, inactive template)
- [x] Create domain module skeletons (auth, users, templates, invoices, wallet, payments, downloads, admin, audit)
- [x] Add pricing constants (FINAL_DOWNLOAD_PRICE=10000, ALLOWED_TOPUP_AMOUNTS=[50000,100000])

### Phase 2: Auth, Roles & App Shell
- [x] Implement Supabase Auth (client + server + middleware)
- [x] Login/register/logout flows
- [x] Sync local users record on auth
- [x] `requireUser()` and `requireAdmin()` helpers
- [x] Auto-create wallet for new users
- [x] Route protection middleware (guest→/app blocked, guest→/admin blocked, user→/admin blocked)
- [x] App shell layouts (user area + admin area)
- [x] Navigation (user: dashboard, templates, invoices, wallet; admin: templates, users, invoices, transactions)
- [x] Auth pages (login, register)
- [ ] Verify: auth guard tests pass

### Phase 3: Template Catalog & Admin Templates
- [x] User template catalog (active templates only, with name/thumbnail/price)
- [x] Template detail page with CTA to create invoice
- [x] Admin template CRUD (list, create, edit, activate/deactivate)
- [x] Audit log for admin template changes
- [x] Authorization: user cannot access admin template APIs

### Phase 4: Invoice Drafting & Versioning
- [x] Invoice content schema validation (sender/client/meta/items/summary)
- [x] Create invoice draft from active template (version 1 unpaid, active_version_id set)
- [x] Invoice list page
- [x] Edit unpaid version (overwrites snapshot, stays unpaid)
- [x] Edit paid version (creates new unpaid version, old paid remains)
- [x] Ownership enforcement on all invoice operations

### Phase 5: Preview Rendering
- [x] Protected preview page (auth + ownership check)
- [x] Render invoice from active version snapshot
- [x] Watermark: PREVIEW, user email, timestamp, version ID
- [x] Light anti-copy deterrence (no print/copy/context menu)
- [x] Guest and other-user blocked from preview

### Phase 6: Wallet & Pakasir Top Up
- [x] Wallet summary page (balance + ledger history)
- [x] Ownership enforcement (user sees own wallet only)
- [x] Top up package selection (Rp50.000 and Rp100.000 only)
- [x] Reject arbitrary amounts server-side
- [x] Create payment_transaction with unique Pakasir order_id
- [x] Build Pakasir payment URL (https://app.pakasir.com/pay/{slug}/{amount}?order_id={id})
- [x] Pakasir webhook handler: persist event, match order_id, verify amount/project/status
- [x] Pakasir Transaction Detail API verification
- [x] Credit wallet exactly once on completed webhook
- [x] Idempotent: duplicate webhook does not double-credit
- [x] Reject forged webhooks (wrong amount, unknown order, signature invalid)

### Phase 7: Final PDF Generation & Paid Download
- [x] HTML-to-PDF pipeline (headless browser)
- [x] Final invoice render component (clean, no watermark)
- [x] Storage upload + signed temporary URL delivery
- [x] Paid download flow: validate ownership → check paid/unpaid → if unpaid check balance ≥ Rp10.000 → lock → generate PDF → atomic debit + mark paid + save key + download log → return signed URL
- [x] Same version re-download: free (return existing file)
- [x] Concurrent download safety: no double-debit
- [x] Generation failure recovery: no debit if PDF fails
- [x] Final PDF not accessible via public permanent URL

### Phase 8: Admin Operations & Audit
- [x] Admin transaction views (wallet ledger, payment transactions)
- [x] Admin user/invoice support views (read-only)
- [x] Admin refund/adjustment (credit/debit with reason)
- [x] Audit log for all sensitive admin actions
- [x] Authorization: regular user blocked from admin operations

### Phase 9: Hardening & Polish
- [ ] User dashboard (balance, recent invoices, recent transactions, quick actions)
- [ ] Loading, empty, and error states across all pages
- [ ] Rate limiting on top up, download, webhook endpoints
- [ ] Structured logging (auth, payment, wallet, invoice, PDF, admin events)
- [ ] Mobile-first responsive check (360px viewport, no horizontal overflow)

### Phase 10: Test Coverage
- [ ] Financial integrity tests (top up, webhook, download, idempotency)
- [ ] Authorization/data isolation tests (guest blocked, user isolation, admin guard)
- [ ] Invoice versioning tests (create, edit unpaid, edit paid)
- [ ] Race condition tests (concurrent webhook, concurrent download)
- [ ] All tests pass: `npm test`

### Phase 11: Deployment & Smoke Verification
- [ ] Production environment checklist documented
- [ ] Preview/staging deployment configured
- [ ] Smoke checklist executed with evidence
- [ ] All verification commands pass: `npm run lint && npm run typecheck && npm test && npm run build && npx prisma validate`

### Phase 12: Production Launch
- [ ] Production readiness review documented
- [ ] Production env vars configured
- [ ] Production deployment live
- [ ] Rollback plan documented
- [ ] Launch evidence recorded

## Verification
Run after every major change:
```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

## Notes
- Tech stack: Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, Supabase Auth, Pakasir, Cloudflare R2/S3, Puppeteer/Playwright, Vercel
- All wallet mutations server-side only, append-only ledger
- Pakasir webhook verification: local match + Transaction Detail API
- Invoice versioning: unpaid edit = overwrite, paid edit = new unpaid version
- Top up fixed: Rp50.000 and Rp100.000 only
- Download price: Rp10.000 per invoice version
- Same-version re-download: free