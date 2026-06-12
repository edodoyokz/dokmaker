# DokMaker MVP Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun DokMaker MVP end-to-end untuk invoice workspace berbasis template dengan wallet deposit, paid PDF download, invoice versioning, admin template management, dan financial safety minimum.

**Architecture:** Aplikasi dibangun sebagai modular monolith berbasis Next.js + TypeScript dengan PostgreSQL dan Prisma. Domain utama dipisahkan menjadi auth, templates, invoices, wallet, payments, downloads, admin, dan audit. Alur finansial menggunakan ledger append-only, webhook idempotent, dan invoice version snapshots untuk menjaga integritas charge/download.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma, Auth.js/Clerk, Pakasir, Cloudflare R2/S3-compatible storage, Puppeteer/Playwright PDF generation.

---

## Execution principles

- Semua mutasi saldo wajib server-side only.
- Semua operasi payment/webhook wajib idempotent.
- Debit saldo + transisi paid invoice version wajib atomic.
- Preview dan final PDF wajib dibedakan jelas.
- Final file tidak boleh dibuka lewat public permanent URL.
- Semua operasi admin sensitif wajib diaudit.
- Fokus MVP hanya invoice template milik platform.
- Seluruh task harus diverifikasi sebelum dianggap selesai.

---

## Phase 0: Engineering decisions & repo bootstrap

### Task 1: Finalisasi keputusan teknis blocker

**Files:**
- Create: `docs/plans/2026-06-12-dokmaker-technical-decisions.md`

**Step 1: Dokumentasikan keputusan final**
Tentukan dan tulis:
- auth provider
- payment gateway
- storage provider
- PDF engine
- deploy target
- top up packages fixed to Rp50.000 and Rp100.000
- currency strategy
- invoice number strategy
- apakah autosave masuk MVP

**Step 2: Review keputusan terhadap PRD**
Pastikan semua keputusan konsisten dengan:
- `docs/plans/2026-06-12-dokmaker-prd.md`
- `docs/plans/2026-06-12-dokmaker-system-design.md`

**Step 3: Commit**
```bash
git add docs/plans/2026-06-12-dokmaker-technical-decisions.md
git commit -m "docs: add technical decisions for dokmaker mvp"
```

---

### Task 2: Bootstrap repo aplikasi

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts` or `next.config.js`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Scaffold Next.js TypeScript app**
Gunakan stack dasar sesuai keputusan teknis.

**Step 2: Tambahkan script minimum**
Minimal scripts:
- `dev`
- `build`
- `start`
- `lint`
- `typecheck`
- `test`

**Step 3: Tambahkan env contract awal**
Masukkan placeholder untuk:
- DB
- auth
- payment
- storage
- app URL

**Step 4: Run checks**
Run:
```bash
npm run build
npm run lint
npm run typecheck
```
Expected: semua command sukses.

**Step 5: Commit**
```bash
git add .
git commit -m "chore: bootstrap dokmaker application"
```

---

## Phase 1: Foundation, auth, dan routing

### Task 3: Implement auth foundation dan role model

**Files:**
- Create/Modify: auth configuration files sesuai provider
- Create: `src/modules/auth/*`
- Create: `src/lib/auth/*`
- Create: `middleware.ts` jika dibutuhkan
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Create: `src/app/app/page.tsx`
- Create: `src/app/admin/page.tsx`

**Step 1: Write failing tests untuk route protection**
Tambahkan test untuk:
- guest tidak bisa akses `/app`
- guest tidak bisa akses `/admin`
- user biasa tidak bisa akses `/admin`

**Step 2: Run test to verify failure**
Run test suite minimal untuk auth guards.
Expected: FAIL karena guard belum ada.

**Step 3: Implement auth + role resolution**
Tambahkan:
- session check
- route protection
- role resolution (`user`, `admin`)

**Step 4: Run tests**
Expected: PASS.

**Step 5: Commit**
```bash
git add .
git commit -m "feat: add auth foundation and role guards"
```

---

### Task 4: Setup shared app shell dan basic navigation

**Files:**
- Create: `src/components/ui/*`
- Create: `src/components/dashboard/*`
- Modify: `src/app/app/page.tsx`
- Modify: `src/app/admin/page.tsx`
- Create: `src/app/app/layout.tsx`
- Create: `src/app/admin/layout.tsx`

**Step 1: Implement app shell**
Tambahkan layout dasar untuk:
- user app area
- admin area

**Step 2: Tambahkan navigation placeholder**
User nav minimal:
- dashboard
- templates
- invoices
- wallet
- profile

Admin nav minimal:
- templates
- users
- invoices
- transactions
- payments

**Step 3: Verify manually**
Run app dan cek route dasar tampil.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add app shell and navigation"
```

---

## Phase 2: Database schema & domain foundations

### Task 5: Define initial Prisma schema dan migrations

**Files:**
- Create: `prisma/schema.prisma`
- Create: migration files under `prisma/migrations/*`

**Step 1: Write failing schema validation expectation**
Definisikan entitas minimal:
- users
- wallets
- wallet_ledger_entries
- payment_transactions
- payment_webhook_events
- invoice_templates
- invoices
- invoice_versions
- download_logs
- admin_audit_logs

**Step 2: Implement Prisma schema**
Tambahkan enums, relationships, indexes, dan unique constraints penting.

**Step 3: Run migration locally**
Run:
```bash
npx prisma validate
npx prisma migrate dev --name init_dokmaker
```
Expected: schema valid, migration sukses.

**Step 4: Commit**
```bash
git add prisma
git commit -m "feat: add initial database schema"
```

---

### Task 6: Create domain service skeletons

**Files:**
- Create: `src/modules/templates/*`
- Create: `src/modules/invoices/*`
- Create: `src/modules/wallet/*`
- Create: `src/modules/payments/*`
- Create: `src/modules/downloads/*`
- Create: `src/modules/admin/*`
- Create: `src/modules/audit/*`

**Step 1: Create service/repository boundaries**
Pisahkan:
- repositories for DB access
- services for business logic
- validators for input rules

**Step 2: Add placeholder tests**
Tambahkan placeholder/unit test dasar agar contract tiap module jelas.

**Step 3: Run tests**
Expected: PASS untuk skeleton test.

**Step 4: Commit**
```bash
git add src/modules
git commit -m "chore: add domain module skeletons"
```

---

## Phase 3: Template catalog

### Task 7: Implement template catalog read flow

**Files:**
- Create: `src/app/app/templates/page.tsx`
- Create: `src/app/app/templates/[templateId]/page.tsx`
- Create/Modify: template module files
- Create: API handlers untuk template list/detail

**Step 1: Write failing tests**
Test cases:
- hanya template `active` yang muncul ke user
- template detail bisa diakses user login
- template inactive tidak muncul di list user

**Step 2: Implement template read services + UI**
Tambahkan list, detail, thumbnail, harga, CTA gunakan template.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add template catalog for users"
```

---

## Phase 4: Invoice drafting & versioning

### Task 8: Implement create invoice draft flow

**Files:**
- Create: `src/app/app/invoices/page.tsx`
- Create: `src/app/app/invoices/new/page.tsx` or route variant with template param
- Create: invoice form components
- Create/Modify: invoice services, validators, APIs

**Step 1: Write failing tests**
Test:
- user bisa create invoice dari template aktif
- invoice pertama membuat version 1 unpaid
- active_version_id terisi

**Step 2: Implement create invoice service**
Pastikan invoice content snapshot tersimpan.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add invoice draft creation"
```

---

### Task 9: Implement edit draft dan versioning rules

**Files:**
- Create: `src/app/app/invoices/[invoiceId]/edit/page.tsx`
- Modify: invoice service files
- Add tests under invoice domain

**Step 1: Write failing tests**
Test:
- unpaid active version di-overwrite saat edit
- paid version yang diedit membuat version baru unpaid
- paid version lama tetap ada

**Step 2: Implement edit logic**
Gunakan content hash/version number sesuai design.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add invoice edit and versioning rules"
```

---

## Phase 5: Preview rendering

### Task 10: Implement protected preview page

**Files:**
- Create: `src/app/app/invoices/[invoiceId]/preview/page.tsx`
- Create: preview module files
- Create: invoice render component(s)

**Step 1: Write failing tests**
Test:
- user hanya bisa preview invoice miliknya
- preview menampilkan watermark/label preview
- guest tidak bisa akses preview

**Step 2: Implement preview rendering**
Tambahkan:
- render invoice dari active version
- watermark
- status preview
- optional lightweight anti-copy behavior

**Step 3: Run tests**
Expected: PASS.

**Step 4: Manual verification**
Cek visual preview cukup jelas dan berbeda dari final.

**Step 5: Commit**
```bash
git add .
git commit -m "feat: add protected invoice preview"
```

---

## Phase 6: Wallet & top up

### Task 11: Implement wallet summary dan transaction history

**Files:**
- Create: `src/app/app/wallet/page.tsx`
- Create: `src/app/app/wallet/transactions/page.tsx`
- Modify: wallet services/APIs

**Step 1: Write failing tests**
Test:
- user bisa lihat saldo miliknya sendiri
- user bisa lihat histori ledger miliknya sendiri
- user tidak bisa akses wallet user lain

**Step 2: Implement wallet read flows**
Tambahkan balance card dan transaction list.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add wallet summary and transaction history"
```

---

### Task 12: Implement top up creation flow

**Files:**
- Create: `src/app/app/wallet/topup/page.tsx`
- Create/Modify: payment services/APIs
- Create provider integration wrapper files

**Step 1: Write failing tests**
Test:
- create payment transaction saat user pilih nominal top up
- nominal invalid ditolak
- redirect/payment payload dikembalikan dengan benar

**Step 2: Implement provider create-payment call**
Tambahkan persistence `payment_transactions`.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add top up payment creation flow"
```

---

### Task 13: Implement payment webhook handling

**Files:**
- Create: `src/app/api/webhooks/payment-provider/route.ts`
- Modify: payment/wallet/audit module files

**Step 1: Write failing tests**
Test:
- webhook success mem-credit saldo tepat sekali
- duplicate webhook tidak double-credit
- signature invalid ditolak

**Step 2: Implement webhook verification + idempotent credit flow**
Tambahkan:
- event log
- payment status update
- wallet ledger credit
- balance update

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add payment webhook processing"
```

---

## Phase 7: Paid final PDF download

### Task 14: Implement final PDF generation pipeline

**Files:**
- Create: `src/lib/pdf/*`
- Create: HTML invoice render templates/components
- Create/Modify: download module files

**Step 1: Write failing tests**
Test:
- PDF generation function menghasilkan artifact untuk invoice snapshot valid
- generation error ditangani dengan status yang benar

**Step 2: Implement HTML-to-PDF pipeline**
Gunakan headless browser.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Manual verification**
Generate sample PDF dan cek layout.

**Step 5: Commit**
```bash
git add .
git commit -m "feat: add final pdf generation pipeline"
```

---

### Task 15: Implement paid download charge flow

**Files:**
- Create: `src/app/api/invoices/[invoiceId]/download/route.ts` or equivalent
- Modify: wallet, invoice, download, audit modules

**Step 1: Write failing tests**
Test cases:
- unpaid version + saldo cukup → debit sekali, mark paid, download berhasil
- unpaid version + saldo kurang → ditolak
- paid version → re-download gratis
- klik paralel tidak menimbulkan double charge
- generation gagal tidak meninggalkan debit sukses yang salah

**Step 2: Implement locking/idempotency + charge flow**
Tambahkan:
- ownership check
- active version check
- processing lock
- secure debit
- mark paid
- storage key persistence
- download log

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add paid final download flow"
```

---

## Phase 8: Admin operations

### Task 16: Implement admin template CRUD

**Files:**
- Create: `src/app/admin/templates/page.tsx`
- Create: `src/app/admin/templates/new/page.tsx`
- Create: `src/app/admin/templates/[templateId]/edit/page.tsx`
- Modify: template admin services/APIs

**Step 1: Write failing tests**
Test:
- admin bisa create/edit/activate/deactivate template
- user biasa tidak bisa akses endpoint admin template

**Step 2: Implement admin template tooling**
Tambahkan form, list, status, pricing.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add admin template management"
```

---

### Task 17: Implement admin transaction/payment visibility

**Files:**
- Create: `src/app/admin/transactions/page.tsx`
- Create: `src/app/admin/payments/page.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/invoices/page.tsx`

**Step 1: Write failing tests**
Test:
- admin dapat melihat daftar payment
- admin dapat melihat wallet ledger
- user biasa tidak dapat mengakses halaman ini

**Step 2: Implement read views**
Tambahkan filter minimal dan detail dasar.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add admin operational views"
```

---

### Task 18: Implement refund/adjustment manual + admin audit log

**Files:**
- Modify: admin, wallet, audit modules
- Create admin adjustment/refund UI/API

**Step 1: Write failing tests**
Test:
- admin adjustment credit/debit tercatat di ledger
- refund tercatat dan mengubah saldo sesuai rule
- audit log tercatat untuk aksi sensitif

**Step 2: Implement admin financial operations**
Adjustment wajib butuh reason.

**Step 3: Run tests**
Expected: PASS.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add admin refund adjustment and audit logs"
```

---

## Phase 9: Hardening, verification, dan release readiness

### Task 19: Add security and race-condition tests

**Files:**
- Create/Modify: test files across auth, wallet, payments, invoices, downloads

**Step 1: Add tests untuk critical scenarios**
Minimal skenario:
- duplicate webhook
- concurrent download requests
- unauthorized invoice access
- unauthorized admin access
- invalid payment signature
- final generation failure recovery

**Step 2: Run focused test suite**
Run:
```bash
npm test
```
Expected: PASS.

**Step 3: Commit**
```bash
git add .
git commit -m "test: add hardening coverage for critical flows"
```

---

### Task 20: Add observability and operational logging

**Files:**
- Modify/Create: audit/logging utilities and integrations

**Step 1: Implement structured logs**
Log categories:
- auth events
- payment events
- wallet mutation
- invoice version transitions
- PDF failures
- admin actions

**Step 2: Verify manually**
Trigger representative flows dan pastikan log terbentuk.

**Step 3: Commit**
```bash
git add .
git commit -m "chore: add structured operational logging"
```

---

### Task 21: End-to-end smoke verification

**Files:**
- Create: `docs/plans/2026-06-12-dokmaker-smoke-checklist.md`
- Create/Modify: test/e2e files jika tool E2E tersedia

**Step 1: Define smoke checklist**
Checklist minimum:
- register/login
- lihat template
- create draft
- preview invoice
- top up sandbox
- webhook success
- saldo bertambah
- final paid download
- re-download same version gratis
- edit paid invoice → version baru unpaid

**Step 2: Run verification commands**
Run semua check yang tersedia:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```
Tambahkan command E2E bila ada.

**Step 3: Record output**
Simpan hasil validasi ke checklist atau handoff notes.

**Step 4: Commit**
```bash
git add .
git commit -m "docs: add smoke verification checklist"
```

---

## Recommended agent ownership

- **Agent A — Foundation/Auth:** Task 2, 3, 4
- **Agent B — Data/Finance:** Task 5, 11, 12, 13, 15, 18
- **Agent C — Invoice Domain:** Task 6, 7, 8, 9
- **Agent D — Rendering/Delivery:** Task 10, 14, 15
- **Agent E — Admin/Ops:** Task 16, 17, 18
- **Agent F — QA/Security:** Task 19, 20, 21

---

## Verification commands

Minimal verification yang harus sering dijalankan:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tambahkan sesuai stack:
- prisma validate
- prisma migrate dev / deploy
- E2E smoke test

---

## Final release readiness checklist

MVP hanya boleh diklaim siap jika terbukti:
- auth dan role guard bekerja
- template aktif hanya tampil ke user
- invoice draft + versioning bekerja sesuai rule
- preview terproteksi dan ber-watermark
- top up sukses hanya menambah saldo sekali
- duplicate webhook aman
- paid final download tidak double charge
- re-download versi sama gratis
- edit paid invoice membuat versi baru unpaid
- admin dapat mengelola template dan melihat transaksi
- audit/logging dasar tersedia
- lint, typecheck, tests, build lulus
