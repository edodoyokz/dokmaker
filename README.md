# DokMaker

Mobile-first PWA untuk generate invoice dari template dengan sistem wallet dan paid PDF download.

## Fitur

### User
- 📄 Template invoice profesional
- ✏️ Buat & edit invoice
- 👁️ Preview dengan watermark
- 💰 Top up saldo via Pakasir
- 📥 Download PDF final (Rp10.000/invoice)
- 🔄 Re-download gratis untuk versi yang sama

### Admin
- 👥 Kelola template invoice
- 📊 Lihat transaksi & ledger
- 💳 Penyesuaian saldo manual
- 📝 Audit log

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth
- **Payment:** Pakasir
- **PDF:** Puppeteer (optional)
- **Deployment:** Vercel

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your Supabase & Pakasir credentials

# 3. Setup database
npx prisma migrate dev --name init
npx prisma db seed

# 4. Run development server
npm run dev
```

📖 Lihat [SETUP.md](SETUP.md) untuk panduan lengkap.

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
npm test             # Run tests (65 tests)
npx prisma validate  # Validate schema
npx prisma studio    # Open Prisma Studio
```

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/          # Login, Register
│   ├── app/             # User dashboard
│   ├── admin/           # Admin dashboard
│   └── api/             # API routes
├── components/          # React components
├── lib/                 # Utilities
│   ├── db/             # Prisma client
│   ├── supabase/       # Supabase client
│   ├── pdf/            # PDF generation
│   └── logger.ts       # Structured logging
├── modules/            # Domain modules
│   ├── auth/           # Authentication
│   ├── invoices/       # Invoice management
│   ├── wallet/         # Wallet operations
│   ├── payments/       # Pakasir integration
│   └── ...
prisma/
├── schema.prisma       # Database schema
└── seed.ts             # Seed data
tests/                  # Test files
docs/                   # Documentation
```

## Business Rules

| Rule | Implementation |
|------|----------------|
| Top up hanya Rp50rb/100rb | `ALLOWED_TOPUP_AMOUNTS` constant |
| Download Rp10rb/invoice | `FINAL_DOWNLOAD_PRICE` constant |
| Re-download gratis | Cek status `paid` di version |
| Edit invoice paid → versi baru | Versioning logic di service |
| Webhook idempotent | `idempotency_key` di ledger |
| Saldo tidak boleh negatif | Balance check sebelum debit |

## Documentation

- [Product Requirements](docs/plans/2026-06-12-dokmaker-prd.md)
- [System Design](docs/plans/2026-06-12-dokmaker-system-design.md)
- [API Contract](docs/plans/2026-06-12-dokmaker-api-contract.md)
- [Database Schema](docs/plans/2026-06-12-dokmaker-database-schema.md)
- [Production Checklist](docs/production/env-checklist.md)
- [Rollback Plan](docs/production/rollback-plan.md)

## Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

Atau via Vercel:
1. Push ke GitHub
2. Import di vercel.com
3. Add environment variables
4. Deploy

## License

Proprietary - DokMaker
