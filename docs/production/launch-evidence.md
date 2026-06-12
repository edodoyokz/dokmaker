# DokMaker Launch Evidence

**Launch Date:** _______________
**Time:** _______________
**Environment:** Production
**URL:** _______________

---

## 1. Deployment Information

| Item | Value |
|------|-------|
| Git Commit SHA | |
| Vercel Deployment ID | |
| Database Migration Status | |
| Pakasir Project Mode | sandbox / production |

---

## 2. Environment Variables Verified

- [ ] `DATABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `APP_BASE_URL` matches production URL
- [ ] `PAKASIR_PROJECT_SLUG` configured
- [ ] `PAKASIR_API_KEY` configured
- [ ] `PAKASIR_WEBHOOK_URL` points to production

---

## 3. Verification Commands

```
npm run lint:           PASS / FAIL
npm run typecheck:      PASS / FAIL
npm test:               PASS / FAIL (65 tests)
npm run build:          PASS / FAIL
npx prisma validate:    PASS / FAIL
npx prisma migrate status: PASS / FAIL
```

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

---

## 6. Known Issues / Risks

| Issue | Severity | Mitigation |
|-------|----------|------------|
| | | |

---

## 7. Rollback Plan

- Previous deployment URL: _______________
- Rollback command: `npx vercel rollback`
- Pakasir webhook disable: Dashboard > Project > Webhook

---

## 8. Monitoring

- [ ] Error tracking configured
- [ ] Uptime monitoring configured
- [ ] Payment webhook monitoring active

---

## 9. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tech Lead | | | |
| Product Owner | | | |

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
