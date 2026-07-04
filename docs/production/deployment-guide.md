# DokMaker Vercel Deployment Guide

**Last Updated:** 2026-07-04

---

## 1. Prerequisites

- Vercel account
- GitHub repository connected
- Supabase project (active, not paused)
- Pakasir project with API key
- Cloudflare R2 bucket configured

---

## 2. Environment Variables

Set these in Vercel → Settings → Environment Variables:

### Database (Supabase)
```
DATABASE_URL=postgresql://postgres.{ref}:{password}@aws-{region}.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.{ref}:{password}@aws-{region}.pooler.supabase.com:5432/postgres
```

### Supabase Auth
```
NEXT_PUBLIC_SUPABASE_URL=https://{ref}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}
SUPABASE_SERVICE_ROLE_KEY={service_role_key}
```

### App
```
APP_BASE_URL=https://{your-domain}.vercel.app
```

### Pakasir Payment
```
PAKASIR_PROJECT_SLUG={slug}
PAKASIR_API_KEY={api_key}
PAKASIR_BASE_URL=https://app.pakasir.com
PAKASIR_WEBHOOK_URL=https://{your-domain}.vercel.app/api/webhooks/pakasir
```

### Cloudflare R2
```
R2_ACCOUNT_ID={account_id}
R2_ACCESS_KEY_ID={access_key}
R2_SECRET_ACCESS_KEY={secret_key}
R2_BUCKET_NAME={bucket}
R2_PUBLIC_URL=https://{cdn-domain}
```

### Optional (Recommended for Production)
```
RATE_LIMIT_REDIS_URL={redis_url}
RATE_LIMIT_REDIS_TOKEN={redis_token}
```

---

## 3. Deploy Steps

### 3.1 Push to GitHub
```bash
git push origin main
```

### 3.2 Import to Vercel
1. Go to https://vercel.com/new
2. Import the GitHub repository
3. Framework Preset: Next.js (auto-detected)
4. Root Directory: `./`
5. Build Command: `npm run build` (default)
6. Output Directory: `.next` (default)
7. Install Command: `npm install` (default)

### 3.3 Configure Environment Variables
Add all variables from Section 2.

### 3.4 Deploy
Click "Deploy". First deployment will take ~2-3 minutes.

### 3.5 Run Database Migration
After first deploy:
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 3.6 Configure Pakasir Webhook
1. Login to Pakasir dashboard
2. Go to project settings
3. Set webhook URL to: `https://{your-domain}.vercel.app/api/webhooks/pakasir`

### 3.7 Verify Deployment
- Visit homepage
- Register/Login
- Create invoice from template
- Preview invoice (watermark visible)
- Top up wallet (Pakasir redirect works)
- Download PDF (wallet debited)

---

## 4. Post-Deploy Checklist

- [ ] Homepage loads without errors
- [ ] User can register/login
- [ ] Templates visible in catalog
- [ ] Invoice creation works
- [ ] Preview shows watermark
- [ ] Top up redirects to Pakasir
- [ ] Webhook credits wallet (test with simulation)
- [ ] Paid download generates PDF
- [ ] Re-download is free
- [ ] Admin panel accessible (as admin user)
- [ ] CSP headers present (check browser devtools)
- [ ] PWA manifest loads (/manifest.json)

---

## 5. CI/CD

GitHub Actions CI (`.github/workflows/ci.yml`) runs on every PR:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npx prisma validate`
- `npm run build`

All must pass before merge. Vercel auto-deploys on push to `main`.

---

## 6. Troubleshooting

### "Unauthorized" on /app after login
- Ensure Supabase Auth email confirmation is enabled or users are confirmed
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Webhook not received
- Verify `PAKASIR_WEBHOOK_URL` points to production URL
- Check Pakasir dashboard webhook configuration
- Verify route is not blocked by Vercel firewall

### PDF download fails
- Check R2 credentials are correct
- Verify bucket has write permissions
- Check Vercel function timeout (may need to increase for large PDFs)

### CSP blocking resources
- CSP is in `next.config.ts`
- `connect-src` includes Supabase domain automatically
- If adding new external services, update CSP

### Database connection issues
- Use pooler URL for `DATABASE_URL` (port 6543, pgbouncer=true)
- Use direct URL for `DIRECT_URL` (port 5432)
- Ensure Supabase project is not paused
