# DokMaker Smoke Test Report

> **Status (2026-06-21):** Template ready. Live smoke run requires a deployed
> environment with configured DATABASE_URL, Supabase, Pakasir sandbox, and R2.
> The static verification portion of the audit is captured in
> `launch-evidence.md` section 3 and 9b.

## Target Environment

- Environment: _______________ (staging / production)
- URL: _______________
- Commit SHA: _______________
- Pakasir mode: sandbox / production
- Date/Time (WIB): _______________
- Tester: _______________

## Static Verification (automated)

| Command | Result |
|---------|--------|
| `npm run lint` | PASS / FAIL |
| `npm run typecheck` | PASS / FAIL |
| `npm test` | PASS / FAIL (___ tests) |
| `npm run build` | PASS / FAIL |
| `npx prisma validate` | PASS / FAIL |
| `npx prisma migrate status` | PASS / FAIL |
| `npm audit --audit-level=high` | PASS / FAIL |

## Manual Smoke Flow

1. [ ] User can sign in
2. [ ] User can create invoice
3. [ ] User can preview watermarked invoice
4. [ ] User can top up Rp50.000 or Rp100.000 through Pakasir test flow
5. [ ] Duplicate Pakasir webhook does not double-credit
6. [ ] User can download final PDF after wallet debit
7. [ ] Duplicate same-version download is free
8. [ ] Edited paid invoice creates unpaid new version
9. [ ] User cannot access another user's invoice/download
10. [ ] Admin route rejects non-admin
11. [ ] Final PDF URL is not public permanent URL
12. [ ] PWA offline does not expose private data

## Financial Safety Invariants

- [ ] Same invoice version can only be charged once
- [ ] Wallet ledger is append-only
- [ ] Balance update and ledger insert happen in the same transaction
- [ ] Duplicate Pakasir webhook is idempotent (no double-credit)
- [ ] Duplicate final download is idempotent (no double-debit)

## Notes / Issues Found

- _______________

## Sign-off

- Smoke approved by: _______________
- Date/Time: _______________
