# DokMaker Rollback / Forward-Fix Plan

**Status:** Launch-preparation reference
**Last updated:** 2026-06-12
**Scope:** Safe recovery for code deploys, database migrations, and payment/wallet incidents.

---

## 1. Principles

- Prefer forward-fix for small, low-risk issues; prefer rollback for broad regressions or data-integrity risk.
- Never run destructive database operations without a confirmed backup.
- Wallet ledger is append-only. Corrections are made with new compensating entries, never by editing/deleting existing rows.

---

## 2. Code deploy rollback (Vercel)

1. Identify the last known-good deployment in the Vercel dashboard or via `vercel_list_deployments`.
2. Roll back the production alias to that deployment (`vercel rollback <deployment-url>` / `vercel_rollback`).
3. Confirm the alias points to the known-good build.
4. Re-run smoke checks: auth, template list, invoice create, wallet view.
5. Record the incident in the launch evidence log.

Rollback is safe when the schema is unchanged between the bad and good deploys. If a migration shipped with the bad deploy, see section 3 first.

## 3. Database migration rollback

DokMaker uses Prisma migrations (`prisma/migrations`). There is currently 1 migration and schema is up to date.

Before any migration in production:
1. Take a verified backup/snapshot of the database.
2. Review the generated SQL for destructive operations (DROP, ALTER that loses data).
3. Apply with `prisma migrate deploy` (never `migrate dev` in production).

If a migration causes problems:
- **Non-destructive migration:** forward-fix with a new corrective migration. This is the default and preferred path.
- **Destructive migration:** restore from the pre-migration backup. Do not attempt manual partial reversals on financial tables.

Hard stop: if a migration is destructive and no backup exists, do not deploy.

## 4. Payment / wallet incident handling

### Duplicate credit suspected
- Webhook crediting is idempotent via unique `idempotencyKey` on the ledger and an early-return for already-`success` payments (`src/modules/payments/pakasir.ts`, `src/modules/wallet/service.ts`).
- Investigate via admin transaction views before any manual change.
- If a genuine duplicate credit occurred, issue a compensating debit ledger entry with a documented reason via admin tooling. Do not delete the original entry.

### Duplicate / double download charge suspected
- Download debit is idempotent via `download:{invoiceId}:{versionNumber}` key and a transactional paid transition.
- If a user was double-charged, issue a compensating credit adjustment with reason via admin tooling.

### Webhook outage / missed credit
- Pakasir transaction-detail API is the source of truth. Re-verification of a completed payment will credit once (idempotency prevents double credit on replay).

## 5. Post-incident checklist

- [ ] Incident root cause recorded
- [ ] Compensating ledger entries (if any) documented with reason
- [ ] Affected users identified
- [ ] Verification commands re-run after fix
- [ ] Launch evidence log updated

## 6. Hard stops (escalate, do not improvise)

- Destructive migration without backup
- Wallet mutation that cannot be made atomic
- Webhook idempotency cannot be guaranteed
- Final file served publicly without authorization
