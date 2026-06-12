# DokMaker MVP System Design Spec

**Version:** v1.0  
**Status:** Draft for AI team implementation  
**Scope:** Invoice Workspace MVP

---

## 1. Tujuan dokumen

Dokumen ini menerjemahkan PRD ke rancangan teknis yang:
- cukup konkret untuk dikerjakan AI team
- menjaga domain finansial tetap aman
- menjaga scope MVP tetap fokus
- memungkinkan ekspansi ke dokumen lain nanti tanpa over-engineering

---

## 2. Prinsip arsitektur

### 2.1 Prinsip utama
1. **Monolith modular dulu**
   - jangan pecah microservice untuk MVP
   - frontend + backend dalam satu codebase lebih aman untuk koordinasi AI team

2. **Server authoritative**
   - semua state penting diputuskan backend
   - terutama authz, saldo, payment status, paid status invoice version, dan file access

3. **Append-only untuk domain finansial**
   - saldo bukan sekadar angka mutable
   - harus ada ledger sebagai source of truth dan audit trail

4. **Versioned document snapshot**
   - invoice yang dibayar harus terkait snapshot tertentu
   - bukan sekadar draft terakhir

5. **Deterrence, not impossible protection**
   - preview boleh diproteksi
   - arsitektur tidak boleh berpura-pura bisa mencegah screenshot absolut

6. **Boring stack**
   - pilih teknologi yang umum, stabil, dan ramah AI coding agent
   - hindari stack eksotis

---

## 3. Rekomendasi stack

### 3.1 App framework
**Recommended:** Next.js

Alasan:
- cocok untuk web app fullstack
- route UI + API dalam satu repo
- mudah untuk auth, dashboard, admin, SSR/CSR campuran
- cocok untuk AI team karena pola umum

### 3.2 Frontend
- React
- TypeScript
- Tailwind CSS
- shadcn/ui atau Radix UI opsional
- Mobile-first responsive UI
- PWA manifest + installable metadata
- Conservative service worker caching for static assets only

### 3.3 Backend
Gunakan Next.js Route Handlers / Server Actions / API routes, dengan domain logic dipisah ke service/repository layer.

### 3.4 Database
**Recommended:** PostgreSQL

Alasan:
- transaksi kuat
- cocok untuk domain wallet/payment
- JSONB cocok untuk snapshot invoice content
- indexing dan constraints matang

### 3.5 ORM
**Recommended:** Prisma

Alasan:
- umum
- type-safe
- migration workflow rapi
- mudah dipakai AI team

### 3.6 Auth
**Selected:** Supabase Auth

Alasan:
- terintegrasi langsung dengan PostgreSQL
- Row Level Security (RLS) bisa dipakai untuk data isolation
- free tier 50K MAU lebih besar dari Clerk
- lebih kontrol atas session/cookie untuk PWA iOS
- less vendor lock-in karena open-source
- stack alignment dengan PostgreSQL yang sudah dipilih

Implementation notes:
- gunakan Supabase Auth untuk user management
- sync user data ke local `users` table jika diperlukan
- implement RLS untuk invoice dan wallet data isolation
- handle PWA iOS browser context separation

### 3.7 Payment gateway
**Selected:** Pakasir

Docs: https://pakasir.com/p/docs

Pakasir project credentials required:
- project `Slug`
- `Api Key`
- configured Webhook URL

MVP recommendation:
- use Pakasir Payment URL redirect for initial top up flow
- verify webhook by matching local order and calling Pakasir Transaction Detail API
- do not credit wallet from webhook body alone

### 3.8 PDF generation
**Recommended:** HTML/CSS to PDF via headless browser

Pilihan implementasi:
- Puppeteer
- Playwright

Rekomendasi:
- gunakan HTML/CSS invoice layout yang dipakai juga untuk preview
- hasil final di-render ke PDF lewat headless browser

### 3.9 File storage
**Recommended:**
- Cloudflare R2
- S3-compatible storage
- Supabase Storage

Dipakai untuk:
- final PDF artifacts
- template thumbnails
- asset pendukung template

### 3.10 Deployment
**Recommended:**
- App: Vercel
- Database: Neon / Supabase Postgres / managed PostgreSQL lain
- Storage: R2 / S3-compatible

---

## 4. High-level architecture

```text
[ Browser ]
    |
    v
[ Next.js App ]
  - UI routes
  - API routes / server actions
  - auth guards
  - admin guards
    |
    +--> [ PostgreSQL ]
    |
    +--> [ Payment Gateway ]
    |       - create payment
    |       - webhook callback
    |
    +--> [ File Storage ]
    |       - final PDFs
    |       - thumbnails
    |
    +--> [ PDF Renderer ]
            - generate preview model
            - generate final PDF
```

---

## 5. Modul sistem

### 5.1 Auth module
Tanggung jawab:
- sign up / sign in
- session validation
- role resolution
- route protection

### 5.2 User module
Tanggung jawab:
- profile
- dashboard summary
- user-specific settings dasar

### 5.3 Template module
Tanggung jawab:
- list template aktif
- detail template
- admin CRUD template
- pricing metadata
- render config

### 5.4 Invoice module
Tanggung jawab:
- create invoice
- save draft
- edit invoice
- content validation
- active version lifecycle
- content snapshot/hash

### 5.5 Preview/render module
Tanggung jawab:
- transform invoice content ke render model
- tampilkan preview web
- apply watermark dan preview labeling

### 5.6 Wallet module
Tanggung jawab:
- current balance retrieval
- ledger append
- debit/credit business rules
- transactional consistency

### 5.7 Payment module
Tanggung jawab:
- create top up order
- verify webhook
- idempotent payment application
- payment event logging

### 5.8 Download/finalization module
Tanggung jawab:
- validate paid/unpaid version
- atomic charge flow
- final PDF generation
- secure delivery
- download logging

### 5.9 Admin module
Tanggung jawab:
- template management
- transaction visibility
- refund/adjustment operations
- audit logging

### 5.10 Audit/observability module
Tanggung jawab:
- operational logs
- error logging
- financial event tracing
- admin action logs

---

## 6. Folder structure recommendation

```text
src/
  app/
    (public)/
    (auth)/
    app/
      dashboard/
      templates/
      invoices/
      wallet/
      payments/
      profile/
    admin/
      templates/
      users/
      invoices/
      transactions/
      payments/
  modules/
    auth/
    users/
    templates/
    invoices/
    preview/
    wallet/
    payments/
    downloads/
    admin/
    audit/
  db/
    schema/
    migrations/
  lib/
    auth/
    db/
    storage/
    payment/
    pdf/
    utils/
  components/
    ui/
    dashboard/
    invoices/
    wallet/
    admin/
```

---

## 7. Database design detail

### 7.1 `users`
- `id` UUID
- `email` unique
- `full_name`
- `role` enum: `user`, `admin`
- `auth_provider`
- `auth_provider_user_id`
- `created_at`
- `updated_at`

### 7.2 `wallets`
- `id`
- `user_id` unique
- `currency`
- `current_balance`
- `created_at`
- `updated_at`

### 7.3 `wallet_ledger_entries`
- `id`
- `wallet_id`
- `user_id`
- `entry_type` enum:
  - `topup_credit`
  - `download_debit`
  - `refund_credit`
  - `manual_adjustment_credit`
  - `manual_adjustment_debit`
- `amount`
- `status` enum:
  - `pending`
  - `success`
  - `failed`
  - `cancelled`
- `reference_type`
- `reference_id`
- `description`
- `idempotency_key` nullable
- `created_by_actor_type`
- `created_by_actor_id`
- `created_at`

### 7.4 `payment_transactions`
- `id`
- `user_id`
- `provider`
- `provider_reference`
- `provider_order_id`
- `amount`
- `currency`
- `status` enum:
  - `created`
  - `pending`
  - `success`
  - `failed`
  - `expired`
  - `cancelled`
- `redirect_url` nullable
- `raw_payload_snapshot` JSONB
- `paid_at` nullable
- `created_at`
- `updated_at`

### 7.5 `payment_webhook_events`
- `id`
- `provider`
- `provider_event_id`
- `event_type`
- `payload_snapshot` JSONB
- `processing_status` enum:
  - `received`
  - `processed`
  - `ignored_duplicate`
  - `failed`
- `processed_at` nullable
- `created_at`

### 7.6 `invoice_templates`
- `id`
- `name`
- `slug`
- `description`
- `thumbnail_storage_key`
- `price_amount`
- `currency`
- `status` enum:
  - `active`
  - `inactive`
- `template_schema` JSONB
- `render_config` JSONB
- `created_at`
- `updated_at`

### 7.7 `invoices`
- `id`
- `user_id`
- `template_id`
- `title`
- `status` enum:
  - `draft`
  - `active`
  - `archived`
- `active_version_id` nullable
- `created_at`
- `updated_at`

### 7.8 `invoice_versions`
- `id`
- `invoice_id`
- `version_number`
- `content_snapshot` JSONB
- `content_hash`
- `status` enum:
  - `unpaid`
  - `processing_payment`
  - `paid`
  - `generation_failed`
- `is_paid`
- `paid_at` nullable
- `first_downloaded_at` nullable
- `final_file_storage_key` nullable
- `created_at`

### 7.9 `download_logs`
- `id`
- `user_id`
- `invoice_id`
- `invoice_version_id`
- `was_paid_download`
- `delivery_method`
- `ip_address`
- `user_agent`
- `created_at`

### 7.10 `admin_audit_logs`
- `id`
- `admin_user_id`
- `action`
- `target_type`
- `target_id`
- `before_snapshot` JSONB nullable
- `after_snapshot` JSONB nullable
- `reason` nullable
- `created_at`

---

## 8. Relational rules

### Required relationships
- `users 1:1 wallets`
- `users 1:n payment_transactions`
- `users 1:n invoices`
- `wallets 1:n wallet_ledger_entries`
- `invoice_templates 1:n invoices`
- `invoices 1:n invoice_versions`
- `invoice_versions 1:n download_logs`

### Critical constraints
- unique `wallets.user_id`
- unique `(invoice_id, version_number)`
- unique processed provider event id bila provider menyediakannya
- optional unique successful debit per invoice_version_id

---

## 9. State machines

### 9.1 Payment transaction state
```text
created -> pending -> success
created -> pending -> failed
created -> pending -> expired
created -> pending -> cancelled
```

Rule:
- hanya `success` men-trigger credit saldo

### 9.2 Invoice version state
```text
unpaid -> processing_payment -> paid
unpaid -> processing_payment -> generation_failed
generation_failed -> processing_payment -> paid
```

Rule:
- `processing_payment` dipakai untuk lock flow
- `paid` final untuk monetization state
- `generation_failed` harus retryable secara aman

---

## 10. Balance strategy

### 10.1 Source of truth
Gunakan:
- `wallet_ledger_entries` sebagai audit trail utama
- `wallets.current_balance` sebagai derived/cached balance yang diupdate dalam transaksi yang sama

### 10.2 Mutation pattern
Untuk credit/debit:
1. buka DB transaction
2. lock wallet row jika perlu
3. validasi balance
4. insert ledger entry
5. update wallet current_balance
6. update related reference status
7. commit

Semua dalam satu transaction.

---

## 11. Invoice versioning strategy

### 11.1 Saat draft pertama dibuat
- create `invoices`
- create `invoice_versions` version 1
- set `active_version_id` ke version 1

### 11.2 Saat user edit draft
Rekomendasi MVP:
- overwrite unpaid active version
- buat version baru hanya ketika draft yang sebelumnya paid diubah

### 11.3 Saat paid invoice diedit
- clone snapshot paid version ke version baru
- apply changes
- set version baru sebagai active version
- status = `unpaid`

---

## 12. Preview architecture

### 12.1 Preview rendering path
- user request preview
- backend ambil active version snapshot
- transform ke render model
- route render halaman preview
- apply watermark overlay

### 12.2 Preview protection
- require login
- verify ownership
- no public raw asset
- optional disable context menu/select/print shortcuts
- watermark:
  - PREVIEW
  - email
  - timestamp
  - invoice/version identifier

### 12.3 Catatan penting
Jangan mendesain preview sebagai asset downloadable clean image/PDF.

---

## 13. Final PDF generation architecture

### 13.1 Recommended pipeline
1. user klik download
2. backend validasi invoice version
3. bila unpaid:
   - lock/version guard
   - cek balance
   - transition ke `processing_payment`
4. render HTML final dari snapshot
5. convert ke PDF via headless browser
6. simpan hasil PDF ke storage
7. debit wallet + mark paid + save storage key
8. return secure access ke file

### 13.2 Sequencing recommendation
Rekomendasi aman untuk MVP:
- mulai processing state dulu
- generate file dulu
- commit debit + paid state hanya jika generate berhasil

Alasan:
- mengurangi kasus “uang terpotong tapi file gagal”

---

## 14. Download charge flow design

### 14.1 Happy path unpaid version
1. auth check
2. ownership check
3. fetch active version
4. jika `paid` → re-download gratis
5. jika `unpaid`:
   - begin transaction/locking strategy
   - ensure not already processing elsewhere
   - ensure wallet balance enough
   - set version `processing_payment`
6. generate PDF di server
7. jika generation gagal:
   - set version `generation_failed`
   - return error
8. jika sukses:
   - begin DB transaction
   - insert debit ledger
   - update wallet balance
   - mark version `paid`
   - set `paid_at`, `first_downloaded_at`, `final_file_storage_key`
   - log download
   - commit
9. return file

### 14.2 Re-download path
- auth + ownership
- version sudah `paid`
- gunakan file existing bila ada
- log `was_paid_download = false`

---

## 15. Payment integration design

### 15.1 Top up creation with Pakasir
1. user pilih nominal
2. backend create `payment_transaction` with unique `provider_order_id`
3. backend build Pakasir payment URL:
   `https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}`
4. optionally append `redirect={return_url}`
5. optionally append `qris_only=1` if QRIS-only mode is chosen
6. save redirect URL
7. return URL ke frontend

### 15.2 Pakasir webhook handling
1. terima webhook from Pakasir
2. save webhook event
3. cek duplicate event/provider reference/order id
4. verify payload matches local payment transaction:
   - `project` equals configured Pakasir slug
   - `order_id` exists locally
   - `amount` matches local amount
   - webhook `status` is `completed`
5. call Pakasir Transaction Detail API using server-side API key:
   `GET /api/transactiondetail?project={slug}&amount={amount}&order_id={order_id}&api_key={api_key}`
6. only if transaction detail status is `completed` and payment has not been applied:
   - begin transaction
   - update payment status to `success`
   - credit wallet ledger
   - update wallet balance
   - mark webhook processed
   - commit
7. response success ke Pakasir

Note: Pakasir docs do not show webhook signature in the sample. If signature support exists in dashboard/future docs, add signature verification before status-detail verification.

### 15.3 Frontend return page
Frontend redirect setelah bayar:
- hanya untuk UX status
- tidak boleh jadi sumber penambahan saldo

---

## 16. API contract awal

### 16.1 Authenticated user APIs
#### Templates
- `GET /api/templates`
- `GET /api/templates/:id`

#### Invoices
- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `PUT /api/invoices/:id`
- `GET /api/invoices/:id/preview`
- `POST /api/invoices/:id/download`

#### Wallet
- `GET /api/wallet`
- `GET /api/wallet/transactions`

#### Payments
- `POST /api/payments/topup`
- `GET /api/payments`
- `GET /api/payments/:id`

#### Downloads
- `GET /api/invoices/:id/downloads`

### 16.2 Webhook APIs
- `POST /api/webhooks/pakasir`

### 16.3 Admin APIs
- `GET /api/admin/templates`
- `POST /api/admin/templates`
- `PUT /api/admin/templates/:id`
- `GET /api/admin/users`
- `GET /api/admin/invoices`
- `GET /api/admin/transactions`
- `GET /api/admin/payments`
- `POST /api/admin/wallet-adjustments`
- `POST /api/admin/refunds`

---

## 17. Validation rules

### 17.1 Invoice validation
Minimal:
- invoice number required
- issue date required
- sender name required
- client name required
- minimal 1 line item
- quantity >= 0
- unit price >= 0
- total computed consistently

### 17.2 Wallet validation
- top up nominal hanya boleh paket Rp50.000 atau Rp100.000 untuk MVP
- debit tidak boleh membuat balance negatif
- adjustment admin harus punya reason

### 17.3 Template validation
- price >= 0
- status valid enum
- render config valid
- template schema valid JSON structure

---

## 18. UI state design

### 18.1 Invoice editor states
- loading
- empty new draft
- editing existing draft
- saving
- save success
- validation error

### 18.2 Preview states
- loading preview
- preview rendered
- preview unavailable/error
- unpaid status
- paid status

### 18.3 Download states
- insufficient balance
- processing
- success
- generation failed
- already paid / free re-download

### 18.4 Wallet states
- no transaction yet
- top up pending
- top up success
- top up failed/expired

---

## 19. Security hardening notes

### 19.1 Must-have
- CSRF/session protections sesuai auth method
- authz checks di server
- rate limit pada login, top up creation, download final, dan webhook endpoint bila perlu
- signed file access
- secret env hanya server-side

### 19.2 Nice-to-have
- anomaly logs untuk repeated failed access
- admin action confirmation untuk refund/adjustment
- IP logging terbatas untuk investigation

---

## 20. Observability design

### Log categories
- auth events
- payment events
- webhook verification failures
- wallet mutation events
- invoice version transitions
- preview render failures
- PDF generation failures
- admin actions

### Metrics ideal
- preview render latency
- PDF generation latency
- webhook processing latency
- top up success ratio
- download success ratio
- generation failure ratio

---

## 21. PWA and mobile-first design

### 21.1 Mobile-first requirements
- Build all user-facing flows for 360px width first.
- Use card/list layouts instead of dense tables on mobile.
- Use touch-friendly controls with at least 44px target height.
- Use sticky bottom CTAs for save, preview, download, and top up where useful.
- Avoid hover-only interactions.
- Admin pages may be desktop/tablet optimized but must not be broken on mobile.

### 21.2 PWA requirements
- Add `manifest.webmanifest`.
- Add app icons.
- Set theme color and viewport metadata.
- App display mode should support `standalone`.
- Start URL should point to `/app` for logged-in users.

### 21.3 PWA caching strategy
- Cache static assets and app shell only.
- Do not cache private invoice/wallet/payment API responses by default.
- Do not cache final PDF signed URLs as offline assets.
- Do not replay payment/wallet/download mutations from service worker.
- Show safe offline state for online-required actions.

---

## 22. Deployment environment design

### Environments
- development
- preview/staging
- production

### Rules
- payment sandbox untuk dev/preview
- live payment hanya production
- separate webhook secrets per env
- separate storage buckets/prefixes per env

---

## 23. Environment variables draft

Kategori variabel:
- `DATABASE_URL`
- auth secrets
- payment provider server key/secret
- payment webhook secret
- storage endpoint/key/secret/bucket
- app base URL
- PDF service config jika ada

Prinsip:
- jangan expose secret ke client
- bedakan publishable vs secret keys

---

## 24. Keputusan teknis yang masih perlu difinalkan

1. Auth provider final
2. Payment gateway final
3. Storage provider final
4. Apakah final PDF disimpan permanen atau generate-once lalu reuse
5. Apakah invoice number manual penuh atau ada auto-suggest
6. Apakah autosave masuk MVP

---

## 25. Default recommendation untuk percepat execution

- Framework: Next.js
- Language: TypeScript
- UI: Tailwind + shadcn/ui
- DB: PostgreSQL
- ORM: Prisma
- Auth: Auth.js atau Clerk
- Payment: Pakasir
- Storage: Cloudflare R2
- PDF: Puppeteer-based HTML-to-PDF
- Deploy: Vercel + managed Postgres

---

## 26. Handoff note untuk AI team

AI team harus menganggap modul berikut sebagai high-risk domains:
1. wallet mutation
2. payment webhook handling
3. invoice version charge rules
4. final download authorization
5. PDF generation failure recovery

Semua domain di atas wajib:
- diuji
- direview
- diverifikasi dengan skenario race condition dasar
