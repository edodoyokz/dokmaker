# DokMaker Launch Evidence

**Launch Date:** _______________
**Time:** _______________
**Environment:** Production
**URL:** _______________

> **Audit remediation progress (2026-06-21):** The static verification
> section below reflects the local codebase state after the 2026-06-21
> production audit remediation. Real deployment URL, DB migration status,
> and Pakasir sandbox verification still need to be filled at launch time.

---

## 1. Deployment Information

| Item | Value |
|------|-------|
| Git Commit SHA | `8994e4b` (main, docs/env finalization) |
| Vercel Deployment ID | TBD |
| Database Migration Status | **UP TO DATE** (3 migrations applied, 0 drift) |
| Pakasir Project Mode | sandbox / production (TBD) |

---

## 2. Environment Variables Verified

- [x] `DATABASE_URL` documented as required (`.env.example`, `scripts/deploy.sh`)
- [x] `DIRECT_URL` documented as required (added in 2026-06-21 audit remediation)
- [x] `NEXT_PUBLIC_SUPABASE_URL` documented
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` documented
- [x] `SUPABASE_SERVICE_ROLE_KEY` documented
- [x] `APP_BASE_URL` documented
- [x] `PAKASIR_PROJECT_SLUG` documented
- [x] `PAKASIR_API_KEY` documented
- [x] `PAKASIR_WEBHOOK_URL` documented
- [x] `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` documented
- [ ] Secrets actually configured in Vercel/GitHub (fill at launch)

---

## 3. Verification Commands

Local static verification (2026-06-21 audit remediation commit `a83bf87`):

```
npm run lint:           PASS
npm run typecheck:      PASS
npm test:               PASS (22 files / 170 tests)
npm run build:          PASS
npx prisma validate:    PASS (with env set)
npx prisma migrate status: PASS — Database schema is up to date!
npm audit --audit-level=high: PASS (no high/critical; 2 moderate PostCSS advisories via Next)
```

At launch, re-run the above and fill results for the deployed commit.

---

## 4. Smoke Test Results

### Auth
- [ ] Register: PASS / FAIL
- [ ] Login: PASS / FAIL
- [ ] Logout: PASS / FAIL
- [ ] Route protection: PASS / FAIL

### Templates
- [ ] User catalog: PASS / FAIL
- [ ] Admin CRUD: PASS / FAIL

### Invoices
- [ ] Create draft: PASS / FAIL
- [ ] Edit invoice: PASS / FAIL
- [ ] Preview: PASS / FAIL

### Wallet & Payments
- [ ] View balance: PASS / FAIL
- [ ] Top up flow: PASS / FAIL / SKIP
- [ ] Webhook received: PASS / FAIL / SKIP
- [ ] Balance credited: PASS / FAIL / SKIP

### Downloads
- [ ] Insufficient balance blocked: PASS / FAIL
- [ ] Paid download: PASS / FAIL / SKIP
- [ ] Free re-download: PASS / FAIL / SKIP

### Admin
- [ ] Admin access: PASS / FAIL
- [ ] User management: PASS / FAIL
- [ ] Transactions view: PASS / FAIL

---

## 5. Security Checklist

- [ ] Supabase service role key not exposed in client
- [ ] Pakasir API key not exposed in client
- [ ] All API routes require auth
- [ ] User data isolation verified
- [ ] Admin routes require admin role
- [ ] Rate limiting active
- [ ] HTTPS enforced
- [ ] Final PDF URL is private/temporary, never public permanent

---

## 6. Known Issues / Risks

| Issue | Severity | Mitigation |
|-------|----------|------------|
| Pakasir API key sent in Transaction Detail query string | Medium | Documented risk; logger redaction active; Transaction Detail URL now uses required `amount` param and documented `{ transaction }` response shape |
| In-memory rate limiter not production-grade for serverless | Medium | Gated/Redis-backed limiter planned (Task 7) |
| `prisma migrate status` drift between repo and remote DB | Medium | RESOLVED 2026-06-21: history synced, schema up to date |
| PostCSS moderate advisory via `next` | Low | Upgrade Next when patch version available |
| `generation_failed` version requires manual recovery (post-debit) | Low | Future admin recovery action |

---

## 7. Rollback Plan

- Previous deployment URL: _______________
- Rollback command: `npx vercel rollback`
- Pakasir webhook disable: Dashboard > Project > Webhook
- Database migration forward-fix path: documented in `docs/production/rollback-plan.md`

---

## 8. Monitoring

- [ ] Error tracking configured
- [ ] Uptime monitoring configured
- [ ] Payment webhook monitoring active
- [ ] Failed PDF generation alerting
- [ ] Wallet adjustment audit dashboard

---

## 9. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tech Lead | | | |
| Product Owner | | | |

---

## 9b. Audit-Driven Verification (2026-06-21)

These are the financial-safety invariants confirmed by automated tests:

- [x] Pakasir webhook rejects body when `status !== completed` (Task 1)
- [x] Pakasir Transaction Detail API verified for status, project, order_id, amount using documented response shape `{ transaction: {...} }` and required `amount` query parameter (Task 1 + follow-up real API fix)
- [x] Duplicate Pakasir webhook does not double-credit wallet via atomic conditional claim (Task 2)
- [x] Concurrent race-loser webhook returns `already_processed` without crediting (Task 2)
- [x] DB-level unique index on `payment_webhook_events(provider, provider_event_id)` is now reflected in Prisma schema (resolved drift 2026-06-21)
- [x] Download PDF generation failure resets version to unpaid, no debit (Task 3)
- [x] Download storage failure resets version to unpaid, no debit (Task 3)
- [x] Download retry after transient failure charges exactly once (Task 3)
- [x] Sensitive API routes do not leak internal error messages (Task 6)
- [x] Pakasir API credential probe succeeds (Transaction Detail endpoint responds as authenticated; invalid order returns 404, missing amount returns 400)
- [ ] Pakasir sandbox transaction completed end-to-end (requires live payment simulation/webhook target)
- [ ] Final PDF URL is private/temporary, verified at deployment
- [ ] Authz/data isolation verified at deployment

---

## 10. Post-Launch Checklist (First 24 Hours)

- [ ] Monitor error rates
- [ ] Check webhook delivery
- [ ] Verify wallet balances
- [ ] Check PDF generation
- [ ] Monitor user registrations
- [ ] Review support requests

---

## 11. Sign-off

**Status:** LAUNCH APPROVED / LAUNCH REJECTED

**Reason:** _______________

**Approved by:** _______________
**Date/Time:** _______________
