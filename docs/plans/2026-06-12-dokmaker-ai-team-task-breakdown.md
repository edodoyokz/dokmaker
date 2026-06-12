# DokMaker MVP AI Team Task Breakdown

**Purpose:** Memecah eksekusi DokMaker MVP menjadi paket kerja yang jelas untuk beberapa AI agent/team dengan dependency, output, dan definition of done yang tegas.

---

## 1. Team structure

### Agent A — Foundation & Auth
Fokus:
- repo bootstrap
- auth
- route guards
- shared layout
- env contract
- app shell

### Agent B — Data & Finance Core
Fokus:
- database schema
- wallet ledger
- payment transactions
- webhook processing
- financial invariants

### Agent C — Invoice Domain
Fokus:
- template catalog read logic
- invoice create/edit
- invoice validation
- invoice versioning

### Agent D — Rendering & File Delivery
Fokus:
- invoice preview
- watermarking
- PDF generation
- secure download delivery
- download logs

### Agent E — Admin & Operations
Fokus:
- admin template CRUD
- admin financial visibility
- admin refund/adjustment tooling
- admin audit views

### Agent F — QA, Security, and Verification
Fokus:
- test strategy
- race-condition checks
- authorization checks
- smoke verification
- release readiness evidence

---

## 2. Dependency overview

### Hard dependencies
- Agent A harus membuka jalan untuk auth, route guards, dan app shell.
- Agent B harus menyiapkan schema dan transaction model untuk domain finansial.
- Agent C bergantung pada schema dasar dan auth.
- Agent D bergantung pada invoice snapshot model dari Agent C.
- Agent E bergantung pada auth/role + schema dasar.
- Agent F bisa mulai lebih awal untuk menyiapkan testing strategy, lalu terus berjalan paralel.

### Safe parallelization map
- A + B: bisa mulai hampir paralel
- C: mulai setelah contract schema/auth stabil
- D: mulai setelah invoice snapshot contract stabil
- E: mulai setelah admin role dan template/payment schema siap
- F: berjalan sepanjang proyek sebagai verifier

---

## 3. Agent deliverables

## 3.1 Agent A — Foundation & Auth

### Deliverables
1. App repository bootstrap
2. Shared app shell
3. Auth integration
4. User/admin role model
5. Route protection
6. `.env.example` contract
7. Base scripts: lint, typecheck, test, build

### Inputs
- `docs/plans/2026-06-12-dokmaker-prd.md`
- `docs/plans/2026-06-12-dokmaker-system-design.md`
- `docs/plans/2026-06-12-dokmaker-execution-plan.md`

### Outputs
- runnable app base
- login/register flow
- protected `/app` and `/admin`
- base navigation/layout

### Definition of done
- guest diblok dari `/app`
- guest diblok dari `/admin`
- user biasa diblok dari `/admin`
- admin bisa masuk area admin
- build/lint/typecheck pass

---

## 3.2 Agent B — Data & Finance Core

### Deliverables
1. Prisma schema/migrations
2. Wallet tables and ledger model
3. Payment transaction model
4. Webhook event model
5. Wallet services
6. Payment services
7. Idempotent top up application
8. Balance-safe debit/credit primitives

### Inputs
- system design
- auth context dari Agent A

### Outputs
- schema siap migrate
- wallet credit/debit service contract
- payment webhook processor
- transaction-safe mutation pattern

### Definition of done
- schema valid dan bisa migrate
- top up success credit hanya sekali
- duplicate webhook tidak menambah saldo dua kali
- negative balance dicegah
- ledger append-only

---

## 3.3 Agent C — Invoice Domain

### Deliverables
1. Template catalog read service
2. Invoice create flow
3. Invoice edit flow
4. Invoice validators
5. Invoice versioning rules
6. Invoice list/dashboard integration

### Inputs
- auth guard dari Agent A
- schema dasar dari Agent B

### Outputs
- template list untuk user
- invoice draft CRUD dasar
- active version logic
- paid-to-new-version transition rule

### Definition of done
- user bisa membuat draft dari template aktif
- invoice pertama membuat version 1 unpaid
- edit unpaid draft tidak membuat noise version berlebih
- edit paid invoice membuat version baru unpaid
- ownership enforcement bekerja

---

## 3.4 Agent D — Rendering & File Delivery

### Deliverables
1. Preview rendering pipeline
2. Watermark logic
3. Final HTML-to-PDF pipeline
4. Secure file delivery flow
5. Download logging
6. PDF generation error handling

### Inputs
- invoice snapshot model dari Agent C
- storage/payment-safe hooks dari Agent B

### Outputs
- preview page
- final PDF generator
- secure delivery strategy
- file artifact persistence contract

### Definition of done
- preview hanya bisa diakses pemilik invoice
- preview jelas bertanda PREVIEW
- final PDF bisa dihasilkan dari snapshot valid
- file final tidak tersedia via public permanent URL
- generation error tercatat dan aman

---

## 3.5 Agent E — Admin & Operations

### Deliverables
1. Admin template CRUD
2. Admin transaction views
3. Admin payment views
4. Admin users/invoices views dasar
5. Manual refund/adjustment actions
6. Admin audit logs

### Inputs
- auth/role dari Agent A
- schema dan financial services dari Agent B
- template/invoice entities dari Agent C

### Outputs
- admin screens/API dasar
- operational support tools
- auditable admin financial actions

### Definition of done
- admin bisa create/edit/activate/deactivate template
- admin bisa melihat payment dan wallet ledger
- admin bisa melakukan adjustment/refund manual dengan reason
- semua aksi sensitif admin tercatat

---

## 3.6 Agent F — QA, Security, and Verification

### Deliverables
1. Test strategy document
2. Critical-path automated tests
3. Authorization tests
4. Duplicate webhook tests
5. Concurrent download tests
6. Smoke verification checklist
7. Release evidence summary

### Inputs
- semua module/flow dari Agent A-E

### Outputs
- automated coverage untuk area kritis
- manual smoke checklist
- known-risk report

### Definition of done
- critical financial/auth/versioning paths teruji
- duplicate webhook scenario ter-cover
- concurrent charge/download scenario ter-cover
- unauthorized access tests pass
- verification evidence terdokumentasi

---

## 4. Work package order

### Package 1 — Foundation
Owner:
- Agent A
- Agent B (schema prep)

Includes:
- repo bootstrap
- auth
- route guards
- app shell
- schema awal

### Package 2 — Core product domain
Owner:
- Agent C
- Agent B

Includes:
- template catalog
- invoice create/edit/versioning
- wallet read model
- payment creation flow

### Package 3 — Monetization flow
Owner:
- Agent B
- Agent D
- Agent C

Includes:
- webhook handling
- preview rendering
- PDF generation
- paid final download
- re-download logic

### Package 4 — Admin operations
Owner:
- Agent E

Includes:
- template CRUD
- transaction visibility
- refund/adjustment
- audit logs

### Package 5 — Hardening and release proof
Owner:
- Agent F
- support from all agents

Includes:
- security tests
- race-condition tests
- smoke flow proof
- release checklist

---

## 5. Cross-agent contracts

## 5.1 Auth contract
Provided by Agent A:
- current user/session resolver
- role resolver
- route protection helpers
- server-side access helper for user/admin checks

## 5.2 Database contract
Provided by Agent B:
- stable schema names
- repository access patterns
- migration process
- transaction helper strategy

## 5.3 Invoice snapshot contract
Provided by Agent C:
- canonical invoice content shape
- validation schema
- content hash strategy
- active version semantics

## 5.4 Render contract
Provided by Agent D:
- input shape accepted by preview/final renderer
- watermark rules
- generated file persistence contract

## 5.5 Financial mutation contract
Provided by Agent B:
- credit wallet API/service contract
- debit wallet API/service contract
- idempotency handling contract
- required error types

## 5.6 Admin audit contract
Provided by Agent E:
- action names
- target model naming
- reason requirements for financial actions

---

## 6. Critical coordination checkpoints

### Checkpoint 1 — After foundation
Verify:
- auth works
- schema compiles
- route guard contract stable

### Checkpoint 2 — After invoice domain base
Verify:
- template selection works
- invoice create/edit works
- versioning semantics agreed and tested

### Checkpoint 3 — After wallet + webhook
Verify:
- top up transaction created
- webhook success credits once
- duplicate event safe

### Checkpoint 4 — After final download flow
Verify:
- unpaid version charge path works
- paid version re-download free
- race-condition protections work

### Checkpoint 5 — Before release claim
Verify:
- admin tools exist
- smoke tests pass
- build/lint/typecheck/tests pass
- residual risks documented

---

## 7. Risk ownership

### Risk: Double charge
Primary owner: Agent B  
Supporting: Agent D, Agent F

### Risk: Unauthorized invoice access
Primary owner: Agent A  
Supporting: Agent C, Agent D, Agent F

### Risk: Preview misuse
Primary owner: Agent D  
Supporting: Product/UX decisions

### Risk: Broken invoice version semantics
Primary owner: Agent C  
Supporting: Agent B, Agent F

### Risk: Admin misuse or hidden changes
Primary owner: Agent E  
Supporting: Agent F

---

## 8. Definition of done for full MVP

MVP hanya dianggap siap jika semua kondisi ini terpenuhi:
- user bisa register/login
- route protection user/admin terbukti
- template aktif bisa dipilih user
- user bisa create/edit draft invoice
- versioning rule paid vs unpaid terbukti benar
- preview invoice terlindungi dan ber-watermark
- top up sandbox berhasil dan credit sekali
- duplicate webhook aman
- paid final PDF download berhasil
- same-version re-download gratis
- insufficient balance ditolak dengan benar
- admin bisa mengelola template
- admin bisa melihat transaksi/payment
- refund/adjustment manual tercatat audit trail
- lint/typecheck/tests/build lulus
- risiko residual terdokumentasi

---

## 9. Recommended communication format antar agent

Setiap agent sebaiknya selalu melaporkan:
1. files changed
2. contract changed
3. tests added/updated
4. verification run
5. blockers
6. residual risks

Format singkat:

```text
Summary:
Changed files:
Contracts impacted:
Tests:
Verification:
Blockers:
Residual risks:
```

---

## 10. Suggested next docs

Agar execution makin mudah, AI team selanjutnya sebaiknya memiliki juga:
- `docs/plans/2026-06-12-dokmaker-api-contract.md`
- `docs/plans/2026-06-12-dokmaker-database-schema.md`
- `docs/plans/2026-06-12-dokmaker-technical-decisions.md`
- `docs/plans/2026-06-12-dokmaker-smoke-checklist.md`
