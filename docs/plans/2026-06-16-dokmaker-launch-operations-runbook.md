# DokMaker Launch Operations Runbook

**Date:** 2026-06-16
**Scope:** Operational procedures required to take DokMaker from a green build to a live production deployment. Companion to `2026-06-16-dokmaker-production-readiness-audit-and-plan.md`.

> **Status of P0/P1 work:** All 6 P0 blockers and all 4 P1 hardening items are implemented and verified (109/109 tests, typecheck/lint/build green) on branch `prod-readiness`. The remaining items below require either external services (Sentry, Supabase dashboard) or a live staging environment (smoke evidence, Pakasir sandbox).

---

## 1. Pre-deploy checklist (run every release)

```bash
npm install                  # triggers postinstall: prisma generate
npm run lint
npm run typecheck
npm test
npm run build                # with NEXT_PUBLIC_SUPABASE_* set
npx prisma validate
npx prisma migrate status    # against the target DB
```

All must pass before promoting. These are also the CI gates.

---

## 2. Database backup & rollback plan (P2-3)

### 2.1 Automated backups (must be enabled on the managed Postgres provider)

- **Neon / Supabase / Vercel Postgres:** enable PITR (point-in-time recovery) and daily logical backups. Confirm the retention window is ≥ 7 days.
- Verify a restore target time can be supplied and that a test restore was performed at least once in staging.

### 2.2 Migration safety rules

- **Every migration must be additive / non-destructive.** Never `DROP TABLE`, `DROP COLUMN`, or change a column type destructively in a single migration. Add the new column, backfill, switch reads, then remove the old one in a *later* release.
- The one new migration in this work (`20260616090000_webhook_event_unique`) is **additive** — it only creates a unique index on `(provider, provider_event_id)`. Postgres allows multiple NULLs in a UNIQUE index, so pre-existing rows without an event id remain valid. It can be applied with zero downtime.
- Always run `npx prisma migrate deploy` against staging first and confirm `prisma migrate status` reports no drift before promoting.

### 2.3 Rollback / forward-fix policy

We use **forward-fix, not reverts**, for anything touching financial state (wallet, ledger, payments, downloads) — because reverting schema/migrations on data that has already mutated can corrupt the ledger. Procedure:

1. **Detect:** Sentry alert or user report (see §4).
2. **Assess blast radius:** query `wallet_ledger_entries` and `payment_transactions` for the affected window.
3. **Mitigate in place:** if a bug over-charged / mis-credited, issue a **correcting** `manual_adjustment_credit`/`debit` via the admin route (which is itself audit-logged) rather than touching rows directly.
4. **Forward-fix:** ship the corrected code as a new commit + migration; never `migrate resolve --rolled-back` on financial migrations.
5. **Only for pure-code regressions with no data impact** (UI, non-financial endpoints): a git revert + redeploy is acceptable.

### 2.4 Emergency DB access

- DB credentials live only in the Vercel project env and the ops password manager — never in the repo.
- A read-only connection string is kept for incident investigation so no accidental writes occur during triage.

---

## 3. Admin-seed runbook (P2-5)

The schema defaults every new user to role `user`. The **first** admin must be promoted manually. Do this exactly once, immediately after the first production deploy.

### 3.1 Promote the first admin (choose one)

**Option A — guarded SQL on the managed DB console** (recommended, leaves a DB-level trail):

```sql
-- Replace with the real Supabase auth user id (users.auth_provider_user_id)
UPDATE users
SET role = 'admin', updated_at = now()
WHERE auth_provider_user_id = '<SUPABASE-AUTH-USER-ID>';
```

**Option B — one-off Prisma script** (typed, auditable). Create a temporary script and delete it after:

```ts
// scripts/promote-admin.ts (do NOT commit)
import { prisma } from "../src/lib/db/prisma";
async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: tsx scripts/promote-admin.ts you@example.com");
  await prisma.user.update({ where: { email }, data: { role: "admin" } });
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: (await prisma.user.findUniqueOrThrow({ where: { email } })).id,
      action: "bootstrap_admin",
      targetType: "user",
      targetId: email,
      detail: { source: "seed-script" },
    },
  });
}
main().finally(() => prisma.$disconnect());
```

Run: `npx tsx scripts/promote-admin.ts you@example.com` then **delete the script**.

### 3.2 Verify

- Sign in as that user; `/admin` must load (otherwise the `requireAdmin` guard 403s).
- Confirm a row exists in `admin_audit_logs` with `action = bootstrap_admin`.
- All subsequent admin promotions should happen via a future admin UI (not SQL), once built.

### 3.3 Hardening follow-up

- After the first admin exists, restrict DB write access further (rotate any shared credential).
- Track a backlog item to build an admin-to-admin promotion screen (requires a second admin to approve — two-person integrity).

---

## 4. Error monitoring (P2-2) — requires Sentry project

Sentry is **not yet integrated**. Before handling real money:

1. Create a Sentry project (Next.js).
2. `npm i @sentry/nextjs && npx @sentry/wizard@latest -i nextjs` (generates `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`, and the `withSentryConfig` wrapper in `next.config.ts`).
3. Wire `Sentry.captureException(err)` into the three API error handlers (`download`, `topup`, `webhook`) and the two `error.tsx` boundaries (`/app`, `/admin`).
4. Set `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and `SENTRY_AUTH_TOKEN` in Vercel.
5. Force a test error in staging and confirm it appears in Sentry.

Until this is done, errors only go to `console`/Vercel logs, which is insufficient for financial incidents.

---

## 5. Smoke evidence (P2-4) — requires staging + Pakasir sandbox

Execute **every** item in `docs/plans/2026-06-12-dokmaker-smoke-checklist.md` against staging and record evidence (screenshots, request/response logs, DB row snapshots) into a new file `docs/plans/2026-06-16-dokmaker-smoke-evidence.md`. The critical path that must be demonstrated end-to-end:

1. Register (Supabase) → wallet auto-created at balance 0.
2. Top up Rp50.000 via Pakasir **sandbox**.
3. Simulate/trigger the Pakasir webhook → assert **exactly one** `wallet_ledger_entry` (`topup_credit`) and balance = 50000. Trigger it **again** → assert no second credit and a duplicate webhook event recorded.
4. Create an invoice from an active template → version 1 is `unpaid`.
5. Preview → assert the **identity watermark** (email + timestamp) renders and `Ctrl+P` is blanked.
6. Buy & download the final PDF → assert a **real `%PDF-`** binary is returned, balance debited 10.000, version flipped to `paid`.
7. Re-download the same version → assert **free** (no second debit).
8. Edit the paid invoice → assert a **new `unpaid` version** is created.
9. Cross-user isolation: user A cannot GET user B's invoice/download (404).

Paste real outputs; do not assert.

---

## 6. Supabase hardening (P2-6) — requires Supabase dashboard

All reads currently go through server routes (no client-side direct table access), so RLS is defense-in-depth rather than a primary control — but it must still be on:

- **Email confirmation:** Auth → confirm email is enabled.
- **Row Level Security:** enabled on every table (`users`, `wallets`, `wallet_ledger_entries`, `invoices`, `invoice_versions`, `payment_transactions`, `payment_webhook_events`, `download_logs`, `admin_audit_logs`, `invoice_templates`).
- **Anon key scope:** the anon role must not be able to `SELECT` from `users`, `wallets`, `invoices`, `payment_transactions`, `wallet_ledger_entries`, `download_logs`, or `admin_audit_logs`. Add a default-deny policy and explicitly allow only what the client truly needs (currently nothing — the browser talks only to Supabase Auth).
- Rotate the anon/service keys if they were ever pasted anywhere untrusted.

---

## 7. Residual risks (carry into launch decision)

1. **Serverless Chromium cold start** adds 1–3s to the first PDF render. `maxDuration=60` covers it; monitor p99 in Sentry.
2. **Single-region** (`sin1`) chosen for wallet consistency → extra latency for far users. Revisit at scale.
3. **Preview deterrence is not absolute** (AGENTS.md §2) — do not market screenshot-proof.
4. **Pakasir HMAC signature** (P1-2) is verified only if `PAKASIR_WEBHOOK_SECRET` is set. Confirm with Pakasir docs whether they provide a signature header; if so, set the secret.
5. **Sentry + live smoke evidence** (§4, §5) are the two items most blocking a confident live-money launch and require the owner's external accounts.
