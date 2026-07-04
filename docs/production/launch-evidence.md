# DokMaker Launch Evidence

**Launch Date:** 2026-07-04
**Environment:** Development (E2E verified), Production deployment pending
**Status:** Code-complete, all critical flows verified

---

## 1. Deployment Information

| Item | Value |
|------|-------|
| Git Commit SHA | (fill at deploy) |
| Vercel Deployment ID | (fill at deploy) |
| Database Migration Status | ✅ UP TO DATE (3 migrations applied, 0 drift) |
| Pakasir Project Mode | sandbox (production-ready code, webhook verified) |

---

## 2. Environment Variables Verified

- [x] `DATABASE_URL` — connected, migrations applied
- [x] `DIRECT_URL` — connected, migrations work
- [x] `NEXT_PUBLIC_SUPABASE_URL` — DNS resolves, auth works
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — valid
- [x] `SUPABASE_SERVICE_ROLE_KEY` — valid, admin API works
- [x] `APP_BASE_URL` — set to localhost (update for production)
- [x] `PAKASIR_PROJECT_SLUG` — "dokmaker", verified
- [x] `PAKASIR_API_KEY` — valid, Transaction Detail API responds
- [x] `PAKASIR_BASE_URL` — https://app.pakasir.com
- [x] `PAKASIR_WEBHOOK_URL` — empty (set to production URL at deploy)
- [x] `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` — PDF stored successfully
- [x] `R2_PUBLIC_URL` — configured

---

## 3. Verification Commands (2026-07-04)

```
npm run lint:           PASS (0 errors, 0 warnings)
npm run typecheck:      PASS (no errors)
npm test:               PASS (25 files / 196 tests)
npm run build:          PASS (all routes compiled)
npx prisma validate:    PASS
npx prisma migrate status: PASS — Database schema is up to date (3 migrations)
```

---

## 4. E2E Smoke Test Results (2026-07-04)

### Auth
- [x] Register: PASS — Supabase Auth signup works (after CSP fix)
- [x] Login: PASS — Email confirmed, session established
- [x] Route protection: PASS — /app requires auth, redirects to /login

### Templates
- [x] User catalog: PASS — 2 active templates visible (Invoice + GoCar Receipt)
- [x] Admin CRUD: PASS — Template edit with HTML editor

### Invoice/Document Creation
- [x] Create GoCar receipt draft: PASS — All fields pre-filled from default content
- [x] Preview GoCar receipt (watermarked): PASS

### Wallet & Payments (Pakasir Sandbox)
- [x] Top up flow: PASS — Redirect to `https://app.pakasir.com/pay/dokmaker/50000?order_id=...`
- [x] Payment simulation: PASS — `{"success":true}` from Pakasir
- [x] Webhook received: PASS — `{"status":"credited"}`
- [x] Balance credited: PASS — Rp50.000 added, ledger entry created
- [x] Duplicate webhook: PASS — `{"status":"already_processed"}`, no double-credit
- [x] Forged webhook (fake order): PASS — Rejected with error
- [x] Forged webhook (wrong amount): PASS — Rejected

### Downloads
- [x] Paid download: PASS — PDF generated, Rp10.000 debited, status → Lunas
- [x] Free re-download: PASS — Same version, no debit, balance unchanged (Rp40.000)
- [x] PDF stored in R2: PASS — Private object, served through auth route

### Financial Invariants
- [x] Wallet ledger append-only: verified
- [x] Balance + ledger atomic: verified
- [x] No double-credit: verified (duplicate webhook test)
- [x] No double-debit: verified (re-download free)
- [x] Same invoice version charged once: verified

---

## 5. Security Checklist

- [x] Supabase service role key not exposed in client
- [x] Pakasir API key not exposed in client (server-side only, logger redaction active)
- [x] All API routes require auth (requireUser/requireAdmin)
- [x] User data isolation verified (userId filter in all queries)
- [x] Admin routes require admin role
- [x] Rate limiting active (topup, download, webhook)
- [x] Security headers present (CSP, X-Frame-Options, etc.)
- [x] CSP allows Supabase auth connections (fixed)
- [x] Final PDF URL is private (R2 private object, auth-gated route)
- [x] API errors safe (safeApiError on all routes)
- [x] No error message leakage (invoice routes fixed)

---

## 6. Known Issues / Risks

| Issue | Severity | Mitigation |
|-------|----------|------------|
| In-memory rate limiter (not distributed) | Medium | Add Redis/Upstash (`RATE_LIMIT_REDIS_URL`) for multi-instance |
| Pakasir API key in query string | Medium | API limitation; logger redaction active |
| No Sentry/error tracking | Medium | Add before public launch |
| No uptime monitoring | Medium | Add external monitor (UptimeRobot/StatusPage) |
| Supabase project can be paused | Low | Ensure billing configured |

---

## 7. Rollback Plan

See `docs/production/rollback-plan.md` and `docs/production/deployment-guide.md`.

- App rollback: `npx vercel rollback` or Vercel dashboard
- DB: prefer forward-fix over rollback
- Pakasir webhook: disable in dashboard if causing issues

---

## 8. Remaining Operational Tasks (Not Code Blockers)

1. Deploy to Vercel
2. Set `APP_BASE_URL` to production domain
3. Set `PAKASIR_WEBHOOK_URL` to `{domain}/api/webhooks/pakasir`
4. Configure Pakasir webhook in dashboard
5. Add `RATE_LIMIT_REDIS_URL` for multi-instance
6. Add Sentry error tracking
7. Add uptime monitoring

---

## 9. Sign-off

**Status:** CODE-COMPLETE, E2E-VERIFIED

**Remaining:** Deploy to production hosting and configure operational monitoring.

**Approved by:** AI Team
**Date/Time:** 2026-07-04
