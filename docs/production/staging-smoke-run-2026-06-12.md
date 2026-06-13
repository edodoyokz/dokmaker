# DokMaker Staging Smoke Run — 2026-06-12

**Status:** TEMPLATE — not yet executed
**Commit SHA:** `370acc2`
**Environment:** _staging URL TBD_
**Pakasir mode:** _sandbox TBD_

This document is the recording template for the end-to-end staging smoke run defined in `docs/plans/2026-06-12-dokmaker-smoke-checklist.md`. It is intentionally unfilled: the run requires a deployed staging instance with seed data and a Pakasir sandbox project. Fill each status as the run is executed.

---

## 1. Pre-run setup

- [ ] Staging deployed at known URL
- [ ] Env contract satisfied (`docs/production/env-checklist.md`)
- [ ] Pakasir sandbox project configured, webhook URL set to `{APP_BASE_URL}/api/webhooks/pakasir`
- [ ] Seed data present: 1 admin, 1 test user, 1 active template, 1 inactive template

## 2. Automated verification (re-run on staging build)

| Command | Result |
|---------|--------|
| `npm run lint` | `[ ]` |
| `npm run typecheck` | `[ ]` |
| `npm test` | `[ ]` |
| `npm run build` | `[ ]` |
| `npx prisma validate` | `[ ]` |
| `npx prisma migrate status` | `[ ]` |

## 3. Manual flow results

### Auth
- [ ] AUTH-001 Register user
- [ ] AUTH-002 Login/logout
- [ ] AUTH-003 Admin route guard

### Templates
- [ ] TPL-001 User sees active templates only
- [ ] TPL-002 Admin can manage template

### Invoice drafting
- [ ] INV-001 Create invoice draft
- [ ] INV-002 Edit unpaid invoice

### Preview
- [ ] PREV-001 Preview invoice (watermark + identity)
- [ ] PREV-002 Preview authorization

### Wallet + Pakasir top up
- [ ] PAY-001 Create top up payment URL
- [ ] PAY-002 Pakasir payment simulation
- [ ] PAY-003 Webhook credits wallet once
- [ ] PAY-004 Duplicate webhook safety
- [ ] PAY-005 Forged webhook body rejected

### Paid final download
- [ ] DL-001 Insufficient balance blocks download
- [ ] DL-002 Paid first download succeeds
- [ ] DL-003 Same version re-download is free
- [ ] DL-004 Edit paid invoice creates unpaid version
- [ ] DL-005 Concurrent download does not double charge
- [ ] DL-006 PDF generation failure recovery

### Admin
- [ ] ADM-001 Admin transaction visibility
- [ ] ADM-002 Manual adjustment/refund audit

### Security
- [ ] SEC-001 User cannot access another user's invoice
- [ ] SEC-002 Final file not public permanent URL
- [ ] SEC-003 Client cannot mutate balance

## 4. Final release evidence summary

```text
Environment:
App URL:
Commit SHA: 370acc2
Database migration status:
Pakasir mode:
Verification commands run:
Smoke tests passed:
Smoke tests failed:
Skipped checks and rationale:
Known residual risks:
Reviewer:
Date/time:
```

## 5. Hard stop conditions (do not declare ready if any fail)

- auth route guard broken
- user can access another user's invoice
- webhook credits wallet without transaction-detail/local verification
- duplicate webhook double-credits wallet
- paid download can double-charge
- final file public without authorization
- build/typecheck/tests fail without accepted rationale
