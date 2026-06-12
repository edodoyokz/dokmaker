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
- [ ] Add Prisma with PostgreSQL
- [ ] Implement full schema (users, wallets, wallet_ledger_entries, payment_transactions, payment_webhook_events, invoice_templates, invoices, invoice_versions, download_logs, admin_audit_logs)
- [ ] Add enums, relationships, indexes, unique constraints
- [ ] Run migration: `npx prisma validate && npx prisma migrate dev --name init_dokmaker`
- [ ] Add seed data (admin user, test user, active template, inactive template)
- [ ] Create domain module skeletons (auth, users, templates, invoices, wallet, payments, downloads, admin, audit)
- [ ] Add pricing constants (FINAL_DOWNLOAD_PRICE=10000, ALLOWED_TOPUP_AMOUNTS=[50000,100000])

### Phase 2: Auth, Roles & App Shell
- [ ] Implement Supabase Auth (client + server + middleware)
- [ ] Login/register/logout flows
- [ ] Sync local users record on auth
- [ ] `requireUser()` and `requireAdmin()` helpers
- [ ] Auto-create wallet for new users
- [ ] Route protection middleware (guest→/app blocked, guest→/admin blocked, user→/admin blocked)
- [ ] App shell layouts (user area + admin area)
- [ ] Navigation (user: dashboard, templates, invoices, wallet; admin: templates, users, invoices, transactions)
- [ ] Auth pages (login, register)
- [ ] Verify: auth guard tests pass

### Phase 3: Template Catalog & Admin Templates
- [ ] User template catalog (active templates only, with name/thumbnail/price)
- [ ] Template detail page with CTA to create invoice
- [ ] Admin template CRUD (list, create, edit, activate/deactivate)
- [ ] Audit log for admin template changes
- [ ] Authorization: user cannot access admin template APIs

### Phase 4: Invoice Drafting & Versioning
- [ ] Invoice content schema validation (sender/client/meta/items/summary)
- [ ] Create invoice draft from active template (version 1 unpaid, active_version_id set)
- [ ] Invoice list page
- [ ] Edit unpaid version (overwrites snapshot, stays unpaid)
- [ ] Edit paid version (creates new unpaid version, old paid remains)
- [ ] Ownership enforcement on all invoice operations

### Phase 5: Preview Rendering
- [ ] Protected preview page (auth + ownership check)
- [ ] Render invoice from active version snapshot
- [ ] Watermark: PREVIEW, user email, timestamp, version ID
- [ ] Light anti-copy deterrence (no print/copy/context menu)
- [ ] Guest and other-user blocked from preview

### Phase 6: Wallet & Pakasir Top Up
- [ ] Wallet summary page (balance + ledger history)
- [ ] Ownership enforcement (user sees own wallet only)
- [ ] Top up package selection (Rp50.000 and Rp100.000 only)
- [ ] Reject arbitrary amounts server-side
- [ ] Create payment_transaction with unique Pakasir order_id
- [ ] Build Pakasir payment URL (https://app.pakasir.com/pay/{slug}/{amount}?order_id={id})
- [ ] Pakasir webhook handler: persist event, match order_id, verify amount/project/status
- [ ] Pakasir Transaction Detail API verification
- [ ] Credit wallet exactly once on completed webhook
- [ ] Idempotent: duplicate webhook does not double-credit
- [ ] Reject forged webhooks (wrong amount, unknown order, signature invalid)

### Phase 7: Final PDF Generation & Paid Download
- [ ] HTML-to-PDF pipeline (headless browser)
- [ ] Final invoice render component (clean, no watermark)
- [ ] Storage upload + signed temporary URL delivery
- [ ] Paid download flow: validate ownership → check paid/unpaid → if unpaid check balance ≥ Rp10.000 → lock → generate PDF → atomic debit + mark paid + save key + download log → return signed URL
- [ ] Same version re-download: free (return existing file)
- [ ] Concurrent download safety: no double-debit
- [ ] Generation failure recovery: no debit if PDF fails
- [ ] Final PDF not accessible via public permanent URL

### Phase 8: Admin Operations & Audit
- [ ] Admin transaction views (wallet ledger, payment transactions)
- [ ] Admin user/invoice support views (read-only)
- [ ] Admin refund/adjustment (credit/debit with reason)
- [ ] Audit log for all sensitive admin actions
- [ ] Authorization: regular user blocked from admin operations

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