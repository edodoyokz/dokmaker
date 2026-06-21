# DokMaker Setup Guide

## Quick Start (5 steps)

### 1. Create Supabase Project (5 min)

1. Go to https://supabase.com → Sign up/Login
2. Click "New Project"
3. Fill in:
   - Name: `dokmaker`
   - Database Password: (generate strong password)
   - Region: Southeast Asia (Singapore)
4. Wait for project creation (~2 minutes)
5. Go to Settings → API:
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

6. Go to Authentication → Providers → Email:
   - Enable Email provider
   - Disable "Confirm email" for testing (optional)

### 2. Create Pakasir Account (5 min)

1. Go to https://app.pakasir.com
2. Sign up with email
3. Create new project:
   - Name: `DokMaker`
   - Slug: `dokmaker` (or custom)
4. Get API key from project settings
5. Set webhook URL: `https://your-domain.com/api/webhooks/pakasir`

### 3. Configure Environment (2 min)

```bash
# Copy example env
cp .env.example .env

# Edit with your values
nano .env
```

Fill in:
```env
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"
APP_BASE_URL="http://localhost:3000"
PAKASIR_PROJECT_SLUG="dokmaker"
PAKASIR_API_KEY="[api-key]"
PAKASIR_BASE_URL="https://app.pakasir.com"
PAKASIR_WEBHOOK_URL="http://localhost:3000/api/webhooks/pakasir"
R2_ACCOUNT_ID="[account-id]"
R2_ACCESS_KEY_ID="[access-key]"
R2_SECRET_ACCESS_KEY="[secret-key]"
R2_BUCKET_NAME="dokmaker-invoice-finals"
# Recommended for production multi-instance/serverless rate limiting:
RATE_LIMIT_REDIS_URL=""
RATE_LIMIT_REDIS_TOKEN=""
```

### 4. Setup Database (2 min)

```bash
# Run migration
npx prisma migrate dev --name init

# Seed data (admin user + templates)
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Testing the Flow

### 1. Register User
- Go to http://localhost:3000/register
- Create account
- Should redirect to dashboard

### 2. Create Invoice
- Go to Templates
- Click template → "Gunakan Template Ini"
- Fill form → Save
- Go to Invoices → see new invoice

### 3. Top Up (Sandbox)
- Go to Wallet → Top Up
- Select Rp50.000
- Click "Bayar dengan Pakasir"
- Complete payment on Pakasir
- Should redirect back with increased balance

### 4. Download Invoice
- Go to Invoice → Preview
- Click Download
- PDF should download (Rp10.000 deducted)

### 5. Admin Access
- Login as admin (seeded: admin@dokmaker.com)
- Go to /admin
- Should see admin dashboard

---

## Production Deployment

### Option A: Vercel (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import repository
4. Add environment variables
5. Deploy

### Option B: Manual

```bash
# Build
npm run build

# Start
npm start
```

---

## Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "Environment variable not found"
Check `.env` file exists and has all values.

### "Database connection failed"
Check `DATABASE_URL` format and credentials.

### Pakasir webhook not working
1. Check webhook URL is accessible
2. Check Pakasir project settings
3. Check server logs for errors

---

## Support

- Docs: `/docs/plans/`
- Issues: Create GitHub issue
- Email: support@dokmaker.com
