# AGENTS.md — DokMaker AI Team Operating Guide

This file defines how AI agents must work in this repository.

## 1. Product context

DokMaker is a production-oriented mobile-first PWA web app for generating invoice documents from platform-provided templates.

Core MVP:
- target users: individual/freelancers
- document type: invoice only
- template owner: admin/platform only
- preview: free, watermarked, protected but not screenshot-proof
- final output: PDF
- UX/platform: mobile-first PWA
- monetization: wallet/deposit
- payment gateway: Pakasir
- top up packages: Rp50.000 and Rp100.000 only
- final download price: Rp10.000 per invoice version
- same-version re-download: free
- edited paid invoice: creates new unpaid version and requires payment again

Primary docs:
- `docs/plans/2026-06-12-dokmaker-prd.md`
- `docs/plans/2026-06-12-dokmaker-system-design.md`
- `docs/plans/2026-06-12-dokmaker-execution-plan.md`
- `docs/plans/2026-06-12-dokmaker-ai-team-task-breakdown.md`
- `docs/plans/2026-06-12-dokmaker-api-contract.md`
- `docs/plans/2026-06-12-dokmaker-database-schema.md`
- `docs/plans/2026-06-12-dokmaker-technical-decisions.md`
- `docs/plans/2026-06-12-dokmaker-smoke-checklist.md`
- `docs/plans/2026-06-12-dokmaker-pricing-and-topup.md`
- `docs/plans/2026-06-12-dokmaker-master-production-implementation-plan.md`
- `docs/plans/2026-06-12-dokmaker-mobile-first-pwa.md`

## 2. Non-negotiable engineering rules

### Financial safety
- Never mutate wallet balance from client-side code.
- All wallet mutations must go through server-side services.
- Wallet ledger must be append-only.
- Balance update and ledger insert must happen in the same database transaction.
- Duplicate Pakasir webhook must not credit wallet twice.
- Duplicate final download requests must not debit wallet twice.
- Same invoice version can only be charged once.

### Payment safety
- Do not trust Pakasir webhook body alone.
- On webhook receive, verify:
  - local `order_id` exists
  - amount matches local payment
  - project matches configured Pakasir slug
  - status is `completed`
  - Pakasir Transaction Detail API confirms completed status
- Pakasir API key must never be exposed to client bundles or logs.

### Authorization
- All user data access must validate authentication and ownership on the server.
- User must never access another user's invoice, wallet, payments, downloads, or files.
- Admin routes and APIs must require admin role.
- Sensitive admin actions must write audit logs.

### File delivery
- Final PDFs must not be served as public permanent URLs.
- Use signed temporary URLs or backend streaming.
- Preview assets must not be clean final documents.

### Preview limitation
- Do not claim screenshot prevention is absolute.
- Use deterrence: watermark, user email/timestamp, protected route, disabled copy/print where practical.

### Mobile-first PWA
- Build user-facing flows for mobile viewport first.
- Avoid horizontal overflow on 360px screens.
- Use touch-friendly controls.
- PWA caching must not cache private invoice, wallet, payment, or final PDF data unsafely.
- Payment, wallet mutation, and final download actions must require online connectivity.

## 3. Recommended stack

Unless changed by the project owner, use:
- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma
- Supabase Auth
- Pakasir
- Cloudflare R2 or S3-compatible storage
- Puppeteer/Playwright for HTML-to-PDF
- Vercel + managed PostgreSQL

## 4. Expected repository structure

```text
src/
  app/
    (public)/
    (auth)/
    app/
    admin/
    api/
  modules/
    auth/
    users/
    templates/
    invoices/
    preview/
    wallet/
    payments/
    downloads/
    admin/
    audit/
  db/
  lib/
  components/
prisma/
docs/plans/
tests/
```

## 5. Development workflow

For every feature or bugfix:
1. Read relevant docs in `docs/plans/`.
2. Identify affected domain and invariants.
3. Write or update tests first for business-critical logic.
4. Implement the smallest safe change.
5. Run focused tests.
6. Run broader verification before claiming done.
7. Report changed files, tests, commands, risks.

## 6. Required verification commands

Run when available:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

Before production launch, also complete:
- `docs/plans/2026-06-12-dokmaker-smoke-checklist.md`

## 7. Agent roles

### Foundation/Auth Agent
Owns app bootstrap, auth, role guards, layouts, env contract.

### Data/Finance Agent
Owns database schema, wallet ledger, payment transaction model, Pakasir webhook, financial invariants.

### Invoice Domain Agent
Owns templates read model, invoice creation/editing, invoice validation, versioning rules.

### Rendering/Delivery Agent
Owns preview rendering, watermark, PDF generation, secure final file delivery, download logs.

### Admin/Ops Agent
Owns admin template CRUD, transaction visibility, refund/adjustment, admin audit logs.

### QA/Security Agent
Owns tests, race-condition scenarios, authz checks, smoke checklist, production-readiness evidence.

## 8. Reporting format

Every agent handoff must include:

```text
Summary:
Changed files:
Contracts impacted:
Tests added/updated:
Verification commands run:
Results:
Blockers:
Residual risks:
```

## 9. Hard stops

Stop and escalate if:
- payment gateway credentials are unavailable for required verification
- auth/ownership model is unclear
- wallet mutation cannot be made atomic
- webhook idempotency cannot be guaranteed
- production deploy target is unknown
- build/typecheck/tests fail and cannot be resolved
- final file delivery is public without authorization
- database migration is destructive without backup/rollback plan

## 10. Production-readiness rule

Do not call the app production-ready unless:
- critical user journey passes end-to-end
- Pakasir sandbox or live equivalent payment verification passes
- duplicate webhook and duplicate download tests pass
- authz/data isolation tests pass
- build/lint/typecheck/tests pass
- env/secrets are configured safely
- rollback/forward-fix plan is documented
- launch checklist is completed with evidence
