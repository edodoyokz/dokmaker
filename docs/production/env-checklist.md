# DokMaker Environment Variable Contract

**Status:** Launch-preparation reference
**Last updated:** 2026-06-12
**Scope:** Variables required to run, verify, and operate DokMaker.

This document is the single source of truth for environment configuration. Do not commit real secret values. Use the platform secret store (Vercel project env, managed Postgres, Supabase, Pakasir dashboard) for production values.

---

## 1. Required variables

| Key | Purpose | Where used | Secret? | Notes |
|-----|---------|-----------|---------|-------|
| `DATABASE_URL` | Postgres connection (pooled / transaction mode) | Prisma client, app runtime | yes | Use pooler URL with `pgbouncer=true` for serverless. |
| `DIRECT_URL` | Postgres direct/session connection | Prisma migrations | yes | Used by migrate/validate. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Auth (browser + server) | no (public) | Exposed to client bundle by design. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Auth (browser + server) | no (public) | Public anon key, RLS must protect data. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase privileged key | Server-only admin/auth sync | yes | Never expose to client; server runtime only. |
| `APP_BASE_URL` | Canonical app origin | Payment redirect, webhook URL building | no | e.g. `https://dokmaker.example.com`. |
| `PAKASIR_PROJECT_SLUG` | Pakasir project identifier | Payment URL + webhook verification | no | Must match webhook `project` field exactly. |
| `PAKASIR_API_KEY` | Pakasir API key | Transaction detail verification | yes | Server-only. Never log. See risk note below. |
| `PAKASIR_BASE_URL` | Pakasir API base | Payment + detail API | no | `https://app.pakasir.com`. |
| `PAKASIR_WEBHOOK_URL` | Configured webhook callback | Reference for Pakasir dashboard | no | `{APP_BASE_URL}/api/webhooks/pakasir`. |

## 2. Optional / storage variables

| Key | Purpose | Secret? | Notes |
|-----|---------|---------|-------|
| Object storage keys (R2/S3) | Persist final PDFs if not streamed | yes | Only required if final PDFs are stored rather than streamed on demand. Confirm before launch. |

## 3. Verification

Local/staging verification requires at minimum:
- `DATABASE_URL`, `DIRECT_URL` for Prisma
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for build/runtime
- Pakasir vars for payment flow smoke tests

```bash
# Confirms schema + DB connectivity
npx prisma validate
npx prisma migrate status
```

## 4. Known risk / hardening note

- `PAKASIR_API_KEY` is currently transmitted as a URL query parameter in the Pakasir transaction-detail request (`src/modules/payments/pakasir.ts`). Query-string secrets can appear in upstream/proxy/access logs. Track moving this to a header or POST body before live launch, or document it as an accepted risk if the Pakasir API requires query placement.

## 5. Handling rules

- All secret-marked keys must be stored only in the deployment platform secret store.
- Never echo secret values in logs, error messages, or client bundles.
- `NEXT_PUBLIC_*` keys are intentionally public; do not place private secrets behind that prefix.
