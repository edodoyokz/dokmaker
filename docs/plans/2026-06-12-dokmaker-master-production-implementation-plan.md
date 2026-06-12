# DokMaker Master Production Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build DokMaker from scratch into a launch-ready production web app for invoice generation, wallet top up via Pakasir, and paid final PDF downloads.

**Architecture:** Modular monolith using Next.js + TypeScript, PostgreSQL, Prisma, server-side domain services, append-only wallet ledger, Pakasir webhook verification, invoice version snapshots, protected preview, secure final file delivery, and admin operations.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, Supabase Auth, Pakasir, S3-compatible storage/Cloudflare R2, Puppeteer or Playwright, Vercel, managed PostgreSQL.

---

## 0. Definition of production-ready

DokMaker is production-ready only when all are true:

1. User can register/login/logout safely.
2. User/admin roles are enforced.
3. User can create invoice draft from active template.
4. User can preview invoice with watermark.
5. User can top up Rp50.000 or Rp100.000 via Pakasir.
6. Pakasir webhook is verified via local match + Transaction Detail API.
7. Wallet balance credits exactly once per successful top up.
8. User can download final PDF for Rp10.000.
9. Same invoice version re-download is free.
10. Edited paid invoice creates new unpaid version.
11. Duplicate webhook does not double-credit.
12. Duplicate/concurrent download does not double-debit.
13. User cannot access other users' data/files.
14. Admin can manage templates and view transactions.
15. Sensitive admin actions are audited.
16. Final PDFs are not public permanent URLs.
17. Lint, typecheck, tests, build pass.
18. Smoke checklist is completed with evidence.
19. Production env/secrets are configured safely.
20. Rollback/forward-fix plan exists.

---

## 1. Master constants and business rules

### Pricing
```ts
export const FINAL_DOWNLOAD_PRICE = 10000;
export const ALLOWED_TOPUP_AMOUNTS = [50000, 100000] as const;
export const DEFAULT_CURRENCY = "IDR";
```

### Business invariants
- Draft is free.
- Preview is free.
- First final download for unpaid invoice version costs Rp10.000.
- Same-version re-download is free.
- Editing a paid invoice creates new unpaid version.
- Top up amount must be exactly Rp50.000 or Rp100.000.
- Wallet mutation is server-only and ledger-backed.

---

## 2. Phase 0 — Repository and project setup

### Task 0.1: Initialize repository

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `AGENTS.md` if not present
- Create: `docs/plans/*` planning docs if not present

**Steps:**
1. Initialize git repo if missing.
2. Ensure planning docs exist.
3. Commit docs baseline.

**Verification:**
```bash
git status
git log --oneline -1
```

**Commit:**
```bash
git add .
git commit -m "docs: add dokmaker product and implementation plans"
```

---

### Task 0.2: Scaffold Next.js app

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/globals.css`
- Create: `.env.example`

**Steps:**
1. Scaffold Next.js with TypeScript.
2. Add Tailwind CSS.
3. Add shadcn/ui setup or component foundation.
4. Add scripts:
   - `dev`
   - `build`
   - `start`
   - `lint`
   - `typecheck`
   - `test`
5. Add `.env.example` with all required env categories.

**Verification:**
```bash
npm run lint
npm run typecheck
npm run build
```

**Commit:**
```bash
git add .
git commit -m "chore: scaffold nextjs application"
```

---

### Task 0.3: Add baseline tooling

**Files:**
- Create/Modify: ESLint config
- Create/Modify: Prettier config if used
- Create/Modify: test config
- Create: `tests/` or colocated test setup

**Steps:**
1. Configure linting.
2. Configure unit/integration test runner.
3. Add one smoke test that passes.

**Verification:**
```bash
npm run lint
npm test
```

**Commit:**
```bash
git add .
git commit -m "chore: add baseline tooling"
```

---

## 3. Phase 1 — Database and domain skeleton

### Task 1.0: Setup Supabase project

**Files:**
- Create: `.env.local` with Supabase credentials
- Modify: `docs/production/env-checklist.md`

**Steps:**
1. Create Supabase project at https://supabase.com
2. Get project URL and anon key
3. Get service role key for server-side operations
4. Configure `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
5. Enable Email auth provider in Supabase dashboard
6. Configure redirect URLs for PWA

**Verification:**
```bash
npm run typecheck
```

**Commit:**
```bash
git add .
git commit -m "chore: setup supabase project credentials"
```

---

### Task 1.1: Add Prisma and PostgreSQL schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/*`
- Create: `src/lib/db/prisma.ts`

**Steps:**
1. Add Prisma.
2. Implement schema from `docs/plans/2026-06-12-dokmaker-database-schema.md`.
3. Add enums and all core tables.
4. Add indexes and unique constraints.
5. Generate migration.

**Verification:**
```bash
npx prisma validate
npx prisma migrate dev --name init_dokmaker
npm run typecheck
```

**Commit:**
```bash
git add prisma src/lib/db
 git commit -m "feat: add database schema"
```

---

### Task 1.2: Add seed data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

**Steps:**
1. Seed admin bootstrap mechanism or documented admin creation.
2. Seed one active invoice template.
3. Seed one inactive invoice template.
4. Use price Rp10.000.

**Verification:**
```bash
npx prisma db seed
```

**Commit:**
```bash
git add prisma package.json
git commit -m "chore: add seed data"
```

---

### Task 1.3: Create domain module skeletons

**Files:**
- Create: `src/modules/auth/*`
- Create: `src/modules/users/*`
- Create: `src/modules/templates/*`
- Create: `src/modules/invoices/*`
- Create: `src/modules/wallet/*`
- Create: `src/modules/payments/*`
- Create: `src/modules/downloads/*`
- Create: `src/modules/admin/*`
- Create: `src/modules/audit/*`
- Create: `src/modules/pricing/constants.ts`

**Steps:**
1. Create service/repository/validator boundaries.
2. Add pricing constants.
3. Add placeholder tests for module imports.

**Verification:**
```bash
npm test
npm run typecheck
```

**Commit:**
```bash
git add src/modules
git commit -m "chore: add domain module skeletons"
```

---

## 4. Phase 2 — Auth, roles, and app shell

### Task 2.1: Implement Supabase Auth

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/modules/auth/session.ts`
- Create: `middleware.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`

**Steps:**
1. Implement Supabase Auth client-side and server-side.
2. Implement login/register/logout flow.
3. Sync/create local `users` record on auth state change.
4. Create `requireUser()` and `requireAdmin()` helpers.
5. Create wallet automatically for new user.
6. Handle PWA iOS browser context separation.

**Tests:**
- guest cannot access user app
- guest cannot access admin app
- user cannot access admin app
- new user gets wallet
- auth session persists in PWA

**Verification:**
```bash
npm test
npm run typecheck
```

**Commit:**
```bash
git add .
git commit -m "feat: implement supabase authentication"
```

---

### Task 2.2: Build app and admin shell

**Files:**
- Create: `src/app/app/layout.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/layout/*`
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Create: `src/app/app/page.tsx`
- Create: `src/app/admin/page.tsx`

**Steps:**
1. Add public landing placeholder.
2. Add auth pages.
3. Add user dashboard shell.
4. Add admin dashboard shell.
5. Add navigation.

**Verification:**
```bash
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add app and admin shell"
```

---

## 5. Phase 3 — Templates and admin template management

### Task 3.1: Implement user template catalog

**Files:**
- Create: `src/app/app/templates/page.tsx`
- Create: `src/app/app/templates/[templateId]/page.tsx`
- Modify: `src/modules/templates/*`

**Steps:**
1. Implement query active templates only.
2. Show name, description, thumbnail, price Rp10.000.
3. Add CTA to create invoice.

**Tests:**
- inactive templates hidden from user
- active templates visible

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add user template catalog"
```

---

### Task 3.2: Implement admin template CRUD

**Files:**
- Create: `src/app/admin/templates/page.tsx`
- Create: `src/app/admin/templates/new/page.tsx`
- Create: `src/app/admin/templates/[templateId]/edit/page.tsx`
- Modify: `src/modules/templates/*`
- Modify: `src/modules/audit/*`

**Steps:**
1. Add admin list all templates.
2. Add create/edit form.
3. Add activate/deactivate.
4. Write audit logs for changes.

**Tests:**
- admin can create/update template
- user cannot access admin template APIs
- audit log created

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add admin template management"
```

---

## 6. Phase 4 — Invoice draft, validation, and versioning

### Task 4.1: Implement invoice content schema

**Files:**
- Create: `src/modules/invoices/invoice-content.schema.ts`
- Create: `src/modules/invoices/invoice-content.types.ts`
- Create: tests for validation

**Steps:**
1. Define invoice content shape.
2. Validate sender/client/meta/items/summary.
3. Ensure totals are deterministic.

**Tests:**
- missing sender rejected
- no items rejected
- negative quantity/price rejected
- valid invoice accepted

**Verification:**
```bash
npm test
```

**Commit:**
```bash
git add .
git commit -m "feat: add invoice content validation"
```

---

### Task 4.2: Implement create invoice draft

**Files:**
- Create: `src/app/app/invoices/page.tsx`
- Create: `src/app/app/invoices/new/page.tsx`
- Create: invoice form components
- Modify: `src/modules/invoices/*`

**Steps:**
1. Create invoice from active template.
2. Create version 1 unpaid.
3. Set active version.
4. List invoices on `/app/invoices`.

**Tests:**
- create invoice creates unpaid version 1
- inactive template rejected
- ownership is set correctly

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add invoice draft creation"
```

---

### Task 4.3: Implement edit invoice and versioning

**Files:**
- Create: `src/app/app/invoices/[invoiceId]/edit/page.tsx`
- Modify: invoice services

**Steps:**
1. Editing unpaid active version updates snapshot.
2. Editing paid active version creates new unpaid version.
3. Previous paid version remains unchanged.
4. Update content hash.

**Tests:**
- unpaid edit does not create paid state
- paid edit creates new unpaid version
- old paid snapshot unchanged
- other user cannot edit invoice

**Verification:**
```bash
npm test
npm run typecheck
```

**Commit:**
```bash
git add .
git commit -m "feat: implement invoice editing and versioning"
```

---

## 7. Phase 5 — Preview rendering

### Task 5.1: Implement protected preview

**Files:**
- Create: `src/app/app/invoices/[invoiceId]/preview/page.tsx`
- Create: `src/modules/preview/*`
- Create: `src/components/invoices/invoice-preview.tsx`

**Steps:**
1. Load active version snapshot.
2. Validate ownership.
3. Render invoice as web preview.
4. Add watermark: PREVIEW, email, timestamp, invoice/version id.
5. Add light deterrence: no print/copy/context menu where practical.

**Tests:**
- guest blocked
- other user blocked
- watermark rendered

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add protected invoice preview"
```

---

## 8. Phase 6 — Wallet and Pakasir top up

### Task 6.1: Implement wallet summary and ledger history

**Files:**
- Create: `src/app/app/wallet/page.tsx`
- Create: `src/app/app/wallet/transactions/page.tsx`
- Modify: `src/modules/wallet/*`

**Steps:**
1. Show current balance.
2. Show ledger entries.
3. Enforce ownership.

**Tests:**
- user sees own wallet
- user cannot access another wallet

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add wallet summary and ledger history"
```

---

### Task 6.2: Implement top up package selection

**Files:**
- Create: `src/app/app/wallet/topup/page.tsx`
- Modify: `src/modules/payments/*`
- Modify: `src/modules/pricing/constants.ts`

**Steps:**
1. Show only Rp50.000 and Rp100.000.
2. Reject arbitrary amounts server-side.
3. Create local payment transaction.
4. Generate unique Pakasir order id.
5. Build Pakasir payment URL.

**Tests:**
- 50000 accepted
- 100000 accepted
- 10000 rejected
- 75000 rejected
- Pakasir URL contains slug, amount, order_id

**Verification:**
```bash
npm test
npm run typecheck
```

**Commit:**
```bash
git add .
git commit -m "feat: add pakasir top up creation"
```

---

### Task 6.3: Implement Pakasir webhook

**Files:**
- Create: `src/app/api/webhooks/pakasir/route.ts`
- Modify: `src/modules/payments/pakasir-client.ts`
- Modify: `src/modules/payments/*`
- Modify: `src/modules/wallet/*`

**Steps:**
1. Persist webhook event.
2. Match local order id.
3. Verify amount/project/status.
4. Call Pakasir Transaction Detail API.
5. Credit wallet exactly once if completed.
6. Mark payment success and webhook processed.
7. Ignore duplicate safely.

**Tests:**
- completed webhook credits once
- duplicate webhook does not double-credit
- wrong amount rejected
- unknown order rejected
- Pakasir detail not completed does not credit

**Verification:**
```bash
npm test
npm run typecheck
```

**Commit:**
```bash
git add .
git commit -m "feat: implement pakasir webhook verification"
```

---

## 9. Phase 7 — Final PDF generation and paid download

### Task 7.1: Implement final PDF renderer

**Files:**
- Create: `src/lib/pdf/*`
- Create: `src/modules/downloads/pdf-generation.ts`
- Create: final invoice render component/template

**Steps:**
1. Render invoice snapshot into final HTML.
2. Convert HTML to PDF.
3. Return binary/artifact.
4. Handle generation errors.

**Tests:**
- valid snapshot generates PDF artifact
- invalid snapshot fails safely

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add final pdf generation"
```

---

### Task 7.2: Implement storage and secure delivery

**Files:**
- Create: `src/lib/storage/*`
- Modify: `src/modules/downloads/*`

**Steps:**
1. Upload final PDF to storage.
2. Generate signed temporary URL or backend stream.
3. Store file key on paid invoice version.
4. Ensure file is not public permanent URL.

**Tests:**
- final file key saved
- signed URL generated or stream authorized
- other user cannot access file

**Verification:**
```bash
npm test
```

**Commit:**
```bash
git add .
git commit -m "feat: add secure pdf storage delivery"
```

---

### Task 7.3: Implement paid final download flow

**Files:**
- Create: `src/app/api/invoices/[invoiceId]/download/route.ts`
- Modify: `src/modules/downloads/*`
- Modify: `src/modules/wallet/*`
- Modify: `src/modules/invoices/*`

**Steps:**
1. Validate auth and ownership.
2. If active version paid, return free re-download.
3. If unpaid, check balance >= Rp10.000.
4. Lock version / prevent concurrent processing.
5. Generate PDF.
6. In DB transaction:
   - insert `download_debit` ledger Rp10.000
   - decrement wallet
   - mark version paid
   - save storage key
   - create download log
7. Return signed URL/stream.

**Tests:**
- insufficient balance rejected
- first download charges Rp10.000
- same version re-download charges Rp0
- concurrent download does not double debit
- generation failure does not create successful debit

**Verification:**
```bash
npm test
npm run typecheck
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: implement paid final download"
```

---

## 10. Phase 8 — Admin operations and audit

### Task 8.1: Admin transaction views

**Files:**
- Create: `src/app/admin/transactions/page.tsx`
- Create: `src/app/admin/payments/page.tsx`
- Create: admin query services

**Steps:**
1. List wallet ledger entries.
2. List payment transactions.
3. Add filters by user/status/reference if simple.
4. Enforce admin role.

**Tests:**
- admin can view transactions
- regular user blocked

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add admin transaction views"
```

---

### Task 8.2: Admin user/invoice support views

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/users/[userId]/page.tsx`
- Create: `src/app/admin/invoices/page.tsx`
- Create: `src/app/admin/invoices/[invoiceId]/page.tsx`

**Steps:**
1. Add read-only user list/detail.
2. Add read-only invoice list/detail.
3. Include enough references for support.
4. Avoid exposing secrets/passwords.

**Tests:**
- admin access allowed
- user access denied

**Verification:**
```bash
npm test
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: add admin support views"
```

---

### Task 8.3: Admin refund/adjustment

**Files:**
- Create/Modify: admin financial action services
- Modify: `src/modules/wallet/*`
- Modify: `src/modules/audit/*`

**Steps:**
1. Add manual adjustment credit/debit.
2. Add refund credit flow.
3. Require reason.
4. Write ledger entry.
5. Write admin audit log.

**Tests:**
- adjustment changes balance correctly
- reason required
- audit log created
- regular user blocked

**Verification:**
```bash
npm test
npm run typecheck
```

**Commit:**
```bash
git add .
git commit -m "feat: add admin refund and adjustment"
```

---

## 11. Phase 9 — UX polish and production hardening

### Task 9.1: Complete user dashboard

**Files:**
- Modify: `src/app/app/page.tsx`
- Create/Modify: dashboard components

**Steps:**
1. Show balance.
2. Show recent invoices.
3. Show recent transactions.
4. Show recent downloads.
5. Add quick actions.

**Verification:**
```bash
npm run build
```

**Commit:**
```bash
git add .
git commit -m "feat: complete user dashboard"
```

---

### Task 9.2: Add loading, empty, and error states

**Files:**
- Modify pages/components across app/admin

**Steps:**
1. Add empty templates/invoices/transactions states.
2. Add safe error messages.
3. Add processing states for top up and download.
4. Add insufficient balance CTA.

**Verification:**
```bash
npm run build
```

**Commit:**
```bash
git add .
git commit -m "fix: add user friendly loading and error states"
```

---

### Task 9.3: Add rate limiting and abuse guards

**Files:**
- Create/Modify: rate limit utilities/middleware
- Apply to auth-sensitive/payment/download endpoints where appropriate

**Steps:**
1. Rate limit top up creation.
2. Rate limit final download attempts.
3. Rate limit webhook endpoint if safe.
4. Log suspicious repeated failures.

**Tests:**
- excessive requests throttled
- normal usage unaffected

**Verification:**
```bash
npm test
```

**Commit:**
```bash
git add .
git commit -m "chore: add rate limiting guards"
```

---

### Task 9.4: Add structured logging and audit coverage

**Files:**
- Create/Modify: `src/lib/logging/*`
- Modify payment, wallet, download, admin services

**Steps:**
1. Log Pakasir webhook results.
2. Log wallet mutations.
3. Log invoice version transitions.
4. Log PDF generation failures.
5. Log admin sensitive actions.

**Verification:**
Trigger representative flows and verify logs.

**Commit:**
```bash
git add .
git commit -m "chore: add operational logging"
```

---

## 12. Phase 10 — Automated test coverage

### Task 10.1: Critical financial tests

**Files:**
- Create/Modify: tests for wallet/payments/downloads

**Required tests:**
- top up 50000 accepted
- top up 100000 accepted
- arbitrary top up rejected
- Pakasir completed webhook credits once
- duplicate webhook ignored
- wrong amount webhook rejected
- paid download debits 10000 once
- re-download debits 0
- concurrent download safe

**Verification:**
```bash
npm test
```

**Commit:**
```bash
git add .
git commit -m "test: add financial integrity coverage"
```

---

### Task 10.2: Authorization and data isolation tests

**Files:**
- Create/Modify: authz tests

**Required tests:**
- guest blocked from `/app`
- user blocked from `/admin`
- user A cannot access user B invoice
- user A cannot download user B PDF
- user cannot call admin financial actions

**Verification:**
```bash
npm test
```

**Commit:**
```bash
git add .
git commit -m "test: add authorization coverage"
```

---

### Task 10.3: Invoice versioning tests

**Files:**
- Create/Modify: invoice domain tests

**Required tests:**
- create draft creates version 1 unpaid
- edit unpaid overwrites active unpaid
- edit paid creates new unpaid version
- old paid version remains downloadable

**Verification:**
```bash
npm test
```

**Commit:**
```bash
git add .
git commit -m "test: add invoice versioning coverage"
```

---

## 13. Phase 11 — Deployment preparation

### Task 11.1: Production environment checklist

**Files:**
- Create: `docs/production/env-checklist.md`

**Steps:**
Document required production env vars:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `PAKASIR_PROJECT_SLUG`
- `PAKASIR_API_KEY`
- `PAKASIR_WEBHOOK_URL`
- storage keys
- storage bucket
- PDF config

**Verification:**
Manual review only.

**Commit:**
```bash
git add docs/production/env-checklist.md
git commit -m "docs: add production environment checklist"
```

---

### Task 11.2: Configure preview/staging deployment

**Files:**
- Modify: deploy config if needed
- Modify: docs if needed

**Steps:**
1. Create managed PostgreSQL preview database.
2. Configure storage preview bucket/prefix.
3. Configure Pakasir sandbox project if available.
4. Configure webhook URL for preview.
5. Deploy preview.

**Verification:**
```bash
npm run build
npx prisma migrate deploy
```

Record preview URL and deployment logs.

**Commit:**
```bash
git add .
git commit -m "chore: configure preview deployment"
```

---

### Task 11.3: Run staging smoke checklist

**Files:**
- Update: `docs/plans/2026-06-12-dokmaker-smoke-checklist.md` or create dated run log
- Create: `docs/production/staging-smoke-run-YYYY-MM-DD.md`

**Steps:**
1. Run all verification commands.
2. Complete smoke checklist.
3. Include Pakasir simulation evidence.
4. Include known risks.

**Hard stop:**
Do not proceed to production if financial/auth/download smoke fails.

**Commit:**
```bash
git add docs/production
git commit -m "docs: record staging smoke verification"
```

---

## 14. Phase 12 — Production launch

### Task 12.1: Production readiness review

**Files:**
- Create: `docs/production/production-readiness-review.md`

**Checklist:**
- PRD acceptance criteria met
- security requirements met
- Pakasir live/sandbox mode decision recorded
- env vars configured
- DB migration reviewed
- storage access verified
- final file delivery protected
- authz tests pass
- financial tests pass
- smoke checklist pass
- rollback plan documented

**Verification:**
```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
```

**Commit:**
```bash
git add docs/production/production-readiness-review.md
git commit -m "docs: add production readiness review"
```

---

### Task 12.2: Production deployment

**Steps:**
1. Confirm explicit approval for production launch.
2. Configure production env vars.
3. Run production migration deploy.
4. Deploy app.
5. Configure Pakasir production webhook URL.
6. Verify deployment health.

**Verification:**
```bash
npx prisma migrate deploy
```

Run production smoke subset:
- login
- template list
- create invoice
- preview
- Pakasir low-risk test payment or verified live readiness path
- final download if approved
- admin transaction visibility

**Evidence to record:**
- production URL
- deployment ID/log
- migration status
- smoke results
- skipped checks with rationale

---

### Task 12.3: Rollback and forward-fix plan

**Files:**
- Create: `docs/production/rollback-plan.md`

**Must include:**
- previous known-good deployment
- DB migration rollback/forward-fix notes
- feature flag/maintenance mode option if available
- Pakasir webhook disable/update procedure
- support contact/process for payment disputes

**Commit:**
```bash
git add docs/production/rollback-plan.md
git commit -m "docs: add production rollback plan"
```

---

## 15. Final launch evidence template

Create:

```text
docs/production/launch-evidence-YYYY-MM-DD.md
```

Content:

```markdown
# DokMaker Launch Evidence

Environment: production
Production URL:
Commit SHA:
Deployment ID:
Database migration status:
Pakasir project mode:
Storage bucket/prefix:

## Verification commands
- npm run lint: PASS/FAIL
- npm run typecheck: PASS/FAIL
- npm test: PASS/FAIL
- npm run build: PASS/FAIL
- npx prisma validate: PASS/FAIL
- npx prisma migrate deploy/status: PASS/FAIL

## Smoke results
- Auth: PASS/FAIL
- Template catalog: PASS/FAIL
- Invoice draft: PASS/FAIL
- Preview: PASS/FAIL
- Pakasir top up: PASS/FAIL/SKIPPED with reason
- Wallet credit: PASS/FAIL/SKIPPED with reason
- Paid download: PASS/FAIL/SKIPPED with reason
- Re-download: PASS/FAIL/SKIPPED with reason
- Admin ops: PASS/FAIL

## Known risks
- ...

## Rollback plan
- ...

## Approval
Owner:
Date/time:
```

---

## 16. Production hard stops

Do not launch production if any are unresolved:
- user can access another user's invoice/file
- Pakasir webhook can credit without detail verification
- duplicate webhook double-credits wallet
- duplicate download double-debits wallet
- paid final file is public permanent URL
- tests/build fail
- production env secrets missing
- migration status unknown
- no rollback/forward-fix plan
- live payment settings not explicitly approved

---

## 17. Post-launch monitoring

First 24–72 hours monitor:
- Pakasir webhook failures
- duplicate webhook events
- wallet ledger mismatches
- PDF generation failures
- failed final downloads
- 403/404 suspicious access attempts
- admin adjustments/refunds
- user support issues

Daily reconciliation query should compare:
- wallet current balances
- ledger sums
- payment success records
- download debit records

---

## 18. Handoff to AI team

Agents must execute in this order unless orchestrator approves parallelization:
1. Phase 0 repo setup
2. Phase 1 database/domain skeleton
3. Phase 2 auth/shell
4. Phase 3 templates/admin template
5. Phase 4 invoice drafting/versioning
6. Phase 5 preview
7. Phase 6 wallet/Pakasir
8. Phase 7 paid PDF download
9. Phase 8 admin ops
10. Phase 9 hardening UX/logging
11. Phase 10 tests
12. Phase 11 staging deployment
13. Phase 12 production launch

Parallelization allowed:
- Foundation and schema can overlap after docs are stable.
- Admin views can start after role guard and schema exist.
- QA can start test scaffolding from Phase 1 onward.
- Rendering can start after invoice snapshot contract exists.

Every phase must end with:
- changed files summary
- tests run
- verification output
- residual risk notes
- commit
