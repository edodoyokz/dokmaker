# DokMaker MVP Database Schema Spec

**Version:** v1.0  
**Status:** Draft for implementation  
**Database:** PostgreSQL  
**ORM recommendation:** Prisma

---

## 1. Schema principles

- Gunakan UUID/CUID untuk primary keys.
- Semua timestamp gunakan timezone-aware timestamp.
- Wallet ledger harus append-only.
- Payment webhook events harus idempotent.
- Invoice paid version harus menyimpan immutable-enough snapshot.
- Ownership harus mudah dicek dari foreign key `user_id`.
- Financial amount sebaiknya integer minor unit, misalnya Rupiah sebagai integer.

---

## 2. Entity relationship overview

```text
users
  ├── wallets
  │     └── wallet_ledger_entries
  ├── payment_transactions
  ├── invoices
  │     └── invoice_versions
  │           └── download_logs
  └── admin_audit_logs (as admin actor)

invoice_templates
  └── invoices

payment_transactions
  └── wallet_ledger_entries (via reference)

payment_webhook_events
  └── payment_transactions (logical provider reference)
```

---

## 3. Enum definitions

### UserRole
- `user`
- `admin`

### TemplateStatus
- `active`
- `inactive`

### InvoiceStatus
- `draft`
- `active`
- `archived`

### InvoiceVersionStatus
- `unpaid`
- `processing_payment`
- `paid`
- `generation_failed`

### WalletLedgerEntryType
- `topup_credit`
- `download_debit`
- `refund_credit`
- `manual_adjustment_credit`
- `manual_adjustment_debit`

### LedgerStatus
- `pending`
- `success`
- `failed`
- `cancelled`

### PaymentStatus
- `created`
- `pending`
- `success`
- `failed`
- `expired`
- `cancelled`

### WebhookProcessingStatus
- `received`
- `processed`
- `ignored_duplicate`
- `failed`

---

## 4. Tables

## 4.1 `users`

Purpose: menyimpan user aplikasi dan role.

### Columns
- `id` primary key
- `email` unique not null
- `full_name` nullable
- `role` enum UserRole default `user`
- `auth_provider` nullable
- `auth_provider_user_id` nullable
- `created_at` not null
- `updated_at` not null

### Indexes
- unique `email`
- optional unique `(auth_provider, auth_provider_user_id)`

### Notes
Jika memakai auth provider eksternal, tabel ini menjadi app user profile mirror.

---

## 4.2 `wallets`

Purpose: menyimpan cached balance user.

### Columns
- `id` primary key
- `user_id` unique not null FK users.id
- `currency` not null default `IDR`
- `current_balance` integer not null default `0`
- `created_at` not null
- `updated_at` not null

### Indexes/constraints
- unique `user_id`
- check `current_balance >= 0` jika memungkinkan

### Notes
`current_balance` harus diupdate hanya dalam transaksi yang juga menulis ledger.

---

## 4.3 `wallet_ledger_entries`

Purpose: append-only audit trail untuk semua mutasi saldo.

### Columns
- `id` primary key
- `wallet_id` not null FK wallets.id
- `user_id` not null FK users.id
- `entry_type` enum WalletLedgerEntryType not null
- `amount` integer not null
- `currency` not null default `IDR`
- `status` enum LedgerStatus not null
- `reference_type` nullable
- `reference_id` nullable
- `description` nullable
- `idempotency_key` nullable
- `created_by_actor_type` nullable (`system`, `user`, `admin`, `webhook`)
- `created_by_actor_id` nullable
- `created_at` not null

### Indexes/constraints
- index `user_id`
- index `wallet_id`
- index `(reference_type, reference_id)`
- unique nullable `idempotency_key` if practical
- check `amount > 0`

### Append-only rule
Jangan update/delete ledger entry success. Jika perlu koreksi, buat entry baru seperti refund/adjustment.

---

## 4.4 `payment_transactions`

Purpose: menyimpan order top up dan status provider.

### Columns
- `id` primary key
- `user_id` not null FK users.id
- `provider` not null
- `provider_reference` nullable
- `provider_order_id` nullable
- `amount` integer not null
- `currency` not null default `IDR`
- `status` enum PaymentStatus not null default `created`
- `redirect_url` nullable
- `raw_payload_snapshot` JSONB nullable
- `paid_at` nullable
- `created_at` not null
- `updated_at` not null

### Indexes/constraints
- index `user_id`
- index `status`
- unique `(provider, provider_reference)` where provider_reference not null
- unique `(provider, provider_order_id)` where provider_order_id not null
- check `amount > 0`

### Notes
Payment success harus meng-credit wallet hanya sekali.

---

## 4.5 `payment_webhook_events`

Purpose: idempotency log untuk webhook provider.

### Columns
- `id` primary key
- `provider` not null
- `provider_event_id` nullable
- `provider_reference` nullable
- `event_type` not null
- `payload_snapshot` JSONB not null
- `processing_status` enum WebhookProcessingStatus not null default `received`
- `processed_at` nullable
- `created_at` not null

### Indexes/constraints
- unique `(provider, provider_event_id)` where provider_event_id not null
- index `(provider, provider_reference)`
- index `processing_status`

### Notes
Jika provider tidak menyediakan event id, gunakan provider reference + event type + status sebagai idempotency strategy.

---

## 4.6 `invoice_templates`

Purpose: template invoice yang dikelola admin.

### Columns
- `id` primary key
- `name` not null
- `slug` unique not null
- `description` nullable
- `thumbnail_storage_key` nullable
- `price_amount` integer not null
- `currency` not null default `IDR`
- `status` enum TemplateStatus not null default `inactive`
- `template_schema` JSONB not null
- `render_config` JSONB not null
- `created_at` not null
- `updated_at` not null

### Indexes/constraints
- unique `slug`
- index `status`
- check `price_amount >= 0`

### Notes
User hanya boleh melihat template `active`.

---

## 4.7 `invoices`

Purpose: container invoice milik user.

### Columns
- `id` primary key
- `user_id` not null FK users.id
- `template_id` not null FK invoice_templates.id
- `title` not null
- `status` enum InvoiceStatus not null default `draft`
- `active_version_id` nullable FK invoice_versions.id
- `created_at` not null
- `updated_at` not null

### Indexes
- index `user_id`
- index `template_id`
- index `(user_id, status)`
- index `active_version_id`

### Notes
Karena circular relation dengan invoice_versions, implementasi migration mungkin perlu relation optional lalu update setelah version dibuat.

---

## 4.8 `invoice_versions`

Purpose: snapshot versi invoice untuk preview, payment, dan final PDF.

### Columns
- `id` primary key
- `invoice_id` not null FK invoices.id
- `version_number` integer not null
- `content_snapshot` JSONB not null
- `content_hash` not null
- `status` enum InvoiceVersionStatus not null default `unpaid`
- `is_paid` boolean not null default false
- `paid_at` nullable
- `first_downloaded_at` nullable
- `final_file_storage_key` nullable
- `created_at` not null

### Indexes/constraints
- unique `(invoice_id, version_number)`
- index `invoice_id`
- index `status`
- index `content_hash`
- optional unique successful paid marker per invoice version via status/is_paid rules

### Invariants
- Jika `status = paid`, maka `is_paid = true`.
- Paid version snapshot tidak boleh diubah destructive.
- Edit terhadap paid active version harus membuat version baru unpaid.

---

## 4.9 `download_logs`

Purpose: audit semua final file delivery.

### Columns
- `id` primary key
- `user_id` not null FK users.id
- `invoice_id` not null FK invoices.id
- `invoice_version_id` not null FK invoice_versions.id
- `was_paid_download` boolean not null
- `delivery_method` not null (`signed_url`, `backend_stream`, etc.)
- `ip_address` nullable
- `user_agent` nullable
- `created_at` not null

### Indexes
- index `user_id`
- index `invoice_id`
- index `invoice_version_id`
- index `created_at`

---

## 4.10 `admin_audit_logs`

Purpose: audit aksi admin sensitif.

### Columns
- `id` primary key
- `admin_user_id` not null FK users.id
- `action` not null
- `target_type` not null
- `target_id` not null
- `before_snapshot` JSONB nullable
- `after_snapshot` JSONB nullable
- `reason` nullable
- `created_at` not null

### Indexes
- index `admin_user_id`
- index `(target_type, target_id)`
- index `action`
- index `created_at`

### Actions examples
- `template.create`
- `template.update`
- `template.activate`
- `template.deactivate`
- `wallet.adjustment_credit`
- `wallet.adjustment_debit`
- `wallet.refund_credit`

---

## 5. Prisma schema draft

```prisma
enum UserRole {
  user
  admin
}

enum TemplateStatus {
  active
  inactive
}

enum InvoiceStatus {
  draft
  active
  archived
}

enum InvoiceVersionStatus {
  unpaid
  processing_payment
  paid
  generation_failed
}

enum WalletLedgerEntryType {
  topup_credit
  download_debit
  refund_credit
  manual_adjustment_credit
  manual_adjustment_debit
}

enum LedgerStatus {
  pending
  success
  failed
  cancelled
}

enum PaymentStatus {
  created
  pending
  success
  failed
  expired
  cancelled
}

enum WebhookProcessingStatus {
  received
  processed
  ignored_duplicate
  failed
}

model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  fullName           String?
  role               UserRole @default(user)
  authProvider       String?
  authProviderUserId String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  wallet              Wallet?
  walletLedgerEntries WalletLedgerEntry[]
  paymentTransactions PaymentTransaction[]
  invoices            Invoice[]
  adminAuditLogs       AdminAuditLog[]

  @@unique([authProvider, authProviderUserId])
  @@map("users")
}

model Wallet {
  id             String   @id @default(cuid())
  userId         String   @unique
  currency       String   @default("IDR")
  currentBalance Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user    User                @relation(fields: [userId], references: [id])
  entries WalletLedgerEntry[]

  @@map("wallets")
}

model WalletLedgerEntry {
  id                 String                @id @default(cuid())
  walletId           String
  userId             String
  entryType          WalletLedgerEntryType
  amount             Int
  currency           String                @default("IDR")
  status             LedgerStatus
  referenceType      String?
  referenceId        String?
  description        String?
  idempotencyKey     String?               @unique
  createdByActorType String?
  createdByActorId   String?
  createdAt          DateTime              @default(now())

  wallet Wallet @relation(fields: [walletId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([walletId])
  @@index([referenceType, referenceId])
  @@map("wallet_ledger_entries")
}

model PaymentTransaction {
  id                 String        @id @default(cuid())
  userId             String
  provider           String
  providerReference  String?
  providerOrderId    String?
  amount             Int
  currency           String        @default("IDR")
  status             PaymentStatus @default(created)
  redirectUrl        String?
  rawPayloadSnapshot Json?
  paidAt             DateTime?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
  @@unique([provider, providerReference])
  @@unique([provider, providerOrderId])
  @@map("payment_transactions")
}

model PaymentWebhookEvent {
  id                 String                  @id @default(cuid())
  provider           String
  providerEventId    String?
  providerReference  String?
  eventType          String
  payloadSnapshot    Json
  processingStatus   WebhookProcessingStatus @default(received)
  processedAt        DateTime?
  createdAt          DateTime                @default(now())

  @@unique([provider, providerEventId])
  @@index([provider, providerReference])
  @@index([processingStatus])
  @@map("payment_webhook_events")
}

model InvoiceTemplate {
  id                  String         @id @default(cuid())
  name                String
  slug                String         @unique
  description         String?
  thumbnailStorageKey String?
  priceAmount         Int
  currency            String         @default("IDR")
  status              TemplateStatus @default(inactive)
  templateSchema      Json
  renderConfig        Json
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  invoices Invoice[]

  @@index([status])
  @@map("invoice_templates")
}

model Invoice {
  id              String        @id @default(cuid())
  userId          String
  templateId      String
  title           String
  status          InvoiceStatus @default(draft)
  activeVersionId String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  user     User            @relation(fields: [userId], references: [id])
  template InvoiceTemplate @relation(fields: [templateId], references: [id])
  versions InvoiceVersion[]

  @@index([userId])
  @@index([templateId])
  @@index([userId, status])
  @@index([activeVersionId])
  @@map("invoices")
}

model InvoiceVersion {
  id                  String               @id @default(cuid())
  invoiceId           String
  versionNumber       Int
  contentSnapshot     Json
  contentHash         String
  status              InvoiceVersionStatus @default(unpaid)
  isPaid              Boolean              @default(false)
  paidAt              DateTime?
  firstDownloadedAt   DateTime?
  finalFileStorageKey String?
  createdAt           DateTime             @default(now())

  invoice      Invoice       @relation(fields: [invoiceId], references: [id])
  downloadLogs DownloadLog[]

  @@unique([invoiceId, versionNumber])
  @@index([invoiceId])
  @@index([status])
  @@index([contentHash])
  @@map("invoice_versions")
}

model DownloadLog {
  id               String   @id @default(cuid())
  userId           String
  invoiceId        String
  invoiceVersionId String
  wasPaidDownload  Boolean
  deliveryMethod   String
  ipAddress        String?
  userAgent        String?
  createdAt        DateTime @default(now())

  invoiceVersion InvoiceVersion @relation(fields: [invoiceVersionId], references: [id])

  @@index([userId])
  @@index([invoiceId])
  @@index([invoiceVersionId])
  @@index([createdAt])
  @@map("download_logs")
}

model AdminAuditLog {
  id             String   @id @default(cuid())
  adminUserId    String
  action         String
  targetType     String
  targetId       String
  beforeSnapshot Json?
  afterSnapshot  Json?
  reason         String?
  createdAt      DateTime @default(now())

  adminUser User @relation(fields: [adminUserId], references: [id])

  @@index([adminUserId])
  @@index([targetType, targetId])
  @@index([action])
  @@index([createdAt])
  @@map("admin_audit_logs")
}
```

---

## 6. Important implementation notes

### 6.1 Prisma partial unique limitations
Prisma may not support all partial unique indexes directly. If needed, create raw SQL migrations for:
- partial unique provider event IDs
- partial unique provider references
- payment application idempotency constraints

### 6.2 Active version relation
`invoices.active_version_id` points to `invoice_versions.id`. Because of circular relation, implementation may use:
- scalar field only in Prisma first, or
- optional relation with careful migration order, or
- query active version manually by ID.

### 6.3 Monetary values
Store `amount` as integer. For IDR, integer rupiah is acceptable. Avoid floating point.

### 6.4 Ledger consistency
Any function that writes ledger must also update `wallets.current_balance` inside the same DB transaction.

### 6.5 Paid snapshot immutability
Do not update `content_snapshot` of a paid invoice version. If user edits paid invoice, create a new version.

---

## 7. Required seed data

Initial seed should create:
- one admin user or admin role bootstrap mechanism
- one active invoice template
- one inactive invoice template for testing visibility

Example active template:
- name: Modern Invoice
- slug: modern-invoice
- price: 10000 IDR
- status: active

---

## 8. Required database tests

### Wallet tests
- create wallet for user
- credit wallet increments balance and writes ledger
- debit wallet decrements balance and writes ledger
- debit fails when insufficient balance
- duplicate idempotency key does not double apply

### Payment tests
- create payment transaction
- apply success webhook once
- duplicate webhook ignored
- invalid provider event does not credit wallet

### Invoice tests
- create invoice creates version 1
- edit unpaid version updates active version
- edit paid version creates new unpaid version
- paid version remains unchanged

### Download tests
- first paid download creates debit ledger
- re-download does not create debit ledger
- concurrent paid download does not double debit

### Admin audit tests
- template update creates audit log
- wallet adjustment creates audit log and ledger entry
