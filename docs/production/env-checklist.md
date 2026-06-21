# DokMaker Production Environment Checklist

**Version:** v1.0
**Last Updated:** 2026-06-12

> **Launch-prep update (2026-06-12):** Added `DIRECT_URL` (used by Prisma migrations) and a security note on the Pakasir API key. See `production-readiness-review.md` for current status.

---

## 1. Required Environment Variables

### 1.1 Database (PostgreSQL)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | `postgresql://user:pass@host:6543/dokmaker?pgbouncer=true` |
| `DIRECT_URL` | Direct/session Postgres connection for migrations | ✅ | `postgresql://user:pass@host:5432/dokmaker` |

**Notes:**
- Use connection pooling for production (e.g., PgBouncer, Supabase pooler) for `DATABASE_URL`
- `DIRECT_URL` is used by `prisma migrate`/`validate` and should point at a session-mode (non-pooled) connection
- Enable SSL for production connections
- Run `npx prisma migrate deploy` before deploying

---

### 1.2 Supabase Auth

| Variable | Description | Required | Client-safe |
|----------|-------------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ | ❌ |

**Setup Steps:**
1. Create Supabase project at https://supabase.com
2. Enable Email provider (Authentication > Providers)
3. Configure redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/login`
4. Copy URL and keys from Settings > API

**Security:**
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to client
- Use only in server-side code (API routes, server components)

---

### 1.3 Application

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `APP_BASE_URL` | Application base URL | ✅ | `https://dokmaker.com` |

---

### 1.4 Pakasir Payment Gateway

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PAKASIR_PROJECT_SLUG` | Pakasir project slug | ✅ | `dokmaker` |
| `PAKASIR_API_KEY` | Pakasir API key | ✅ | `pk_xxx...` |
| `PAKASIR_BASE_URL` | Pakasir API base URL | ✅ | `https://app.pakasir.com` |
| `PAKASIR_WEBHOOK_URL` | Webhook callback URL | ✅ | `https://dokmaker.com/api/webhooks/pakasir` |

**Security note:** `PAKASIR_API_KEY` is currently sent as a URL query parameter in the transaction-detail request (`src/modules/payments/pakasir.ts`). Query-string secrets can appear in upstream/proxy/access logs. Track moving it to a header or POST body before live launch, or document as accepted risk if the Pakasir API requires query placement.

**Logging redaction (added 2026-06-21):** `src/lib/logger.ts` applies `redactSecrets()` to all messages and metadata before writing to the log sink. Patterns covered: `api_key=` query params, `PAKASIR_API_KEY=...`, `SUPABASE_SERVICE_ROLE_KEY=...`, `R2_SECRET_ACCESS_KEY=...`, and `Authorization: Bearer ...`. Even with this safeguard, do not log full fetch URLs; prefer logging only `order_id`, `project`, and a success/failure boolean.

**Setup Steps:**
1. Create Pakasir account at https://app.pakasir.com
2. Create project with slug `dokmaker` (or custom)
3. Get API key from project settings
4. Configure webhook URL in project settings
5. For sandbox testing, use test mode if available

**Webhook Configuration:**
```
URL: https://your-domain.com/api/webhooks/pakasir
Method: POST
Content-Type: application/json
```

---

### 1.5 Storage (Cloudflare R2 / S3-compatible)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `R2_ACCOUNT_ID` | Cloudflare account ID | ✅ for production PDF storage | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_ACCESS_KEY_ID` | R2 access key ID | ✅ for production PDF storage | `xxx` |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key | ✅ for production PDF storage | `xxx` |
| `R2_BUCKET_NAME` | R2 bucket name | ✅ for production PDF storage | `dokmaker-pdfs` |
| `R2_PUBLIC_URL` | Optional public/custom URL prefix | Optional | `https://files.dokmaker.com` |

**Notes:**
- Final PDFs must not be served as permanent public URLs.
- Use signed temporary URLs or backend streaming for final downloads.
- `R2_PUBLIC_URL` is optional and must not bypass authorization for final PDFs.

---

### 1.6 Rate Limiting

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `RATE_LIMIT_REDIS_URL` | Distributed rate limiting store (Redis/Upstash/Vercel KV) | Recommended for production | `redis://...` |
| `RATE_LIMIT_REDIS_TOKEN` | Optional Redis auth token (provider-dependent) | Optional | `xxx...` |

**Notes:**
- Without `RATE_LIMIT_REDIS_URL`, the app logs a hard warning and falls back to per-instance in-memory counters.
- In-memory rate limiting is acceptable for local development only; it is not reliable on serverless/multi-instance deployments.

---

## 2. External Service Setup

### 2.1 Supabase Project

- [ ] Create project
- [ ] Enable Email auth provider
- [ ] Configure redirect URLs
- [ ] Copy URL, anon key, service role key
- [ ] Set up RLS policies (optional, app handles auth)

### 2.2 Pakasir Project

- [ ] Create account
- [ ] Create project
- [ ] Note project slug
- [ ] Get API key
- [ ] Configure webhook URL
- [ ] Test sandbox payment (if available)

### 2.3 Database

- [ ] Create production database
- [ ] Run `npx prisma migrate deploy`
- [ ] Verify all tables created
- [ ] Run seed if needed (admin user)
- [ ] Enable backups

### 2.4 Storage (Optional for MVP)

- [ ] Create R2/S3 bucket
- [ ] Configure CORS if needed
- [ ] Create access keys
- [ ] Test upload/download

---

## 3. Deployment Checklist

### 3.1 Pre-deployment

```bash
# Run all verification
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
```

### 3.2 Vercel Deployment

1. Connect GitHub repository
2. Configure environment variables
3. Set build command: `npm run build`
4. Set output: `.next`
5. Deploy

### 3.3 Post-deployment

- [ ] Verify app loads
- [ ] Test login/register
- [ ] Test template list
- [ ] Test invoice creation
- [ ] Test preview
- [ ] Test top up flow (sandbox)
- [ ] Test webhook (sandbox)
- [ ] Test download flow

---

## 4. Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` not in client bundle
- [ ] `PAKASIR_API_KEY` not in client bundle
- [ ] `STORAGE_SECRET_KEY` not in client bundle
- [ ] All API routes validate auth
- [ ] All user queries include ownership filter
- [ ] Admin routes check admin role
- [ ] Rate limiting enabled on financial endpoints
- [ ] `RATE_LIMIT_REDIS_URL` configured for reliable production rate limiting, or fail-open in-memory fallback explicitly accepted as a launch risk
- [ ] HTTPS enforced

---

## 5. Monitoring Checklist

- [ ] Error tracking (Sentry, etc.)
- [ ] Uptime monitoring
- [ ] Payment webhook monitoring
- [ ] Database connection monitoring
- [ ] Log aggregation

---

## 6. Rollback Plan

If critical issues found:

1. **Immediate:** Revert to previous Vercel deployment
2. **Database:** Forward-fix preferred (migrations are additive)
3. **Pakasir:** Disable webhook URL in Pakasir dashboard
4. **Communication:** Notify users via status page/email

---

## 7. Environment Variable Template

```env
# Database
DATABASE_URL="postgresql://user:password@host:6543/dokmaker?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/dokmaker"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# App
APP_BASE_URL="https://dokmaker.com"

# Pakasir
PAKASIR_PROJECT_SLUG="dokmaker"
PAKASIR_API_KEY="pk_xxx"
PAKASIR_BASE_URL="https://app.pakasir.com"
PAKASIR_WEBHOOK_URL="https://dokmaker.com/api/webhooks/pakasir"

# Storage (Optional)
STORAGE_ENDPOINT=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_BUCKET=""
STORAGE_PUBLIC_URL=""
```
