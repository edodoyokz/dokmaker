# DokMaker MVP Product Requirements Document

**Version:** v1.0  
**Status:** Draft for execution handoff  
**Product type:** Mobile-first PWA web app  
**Primary audience:** AI engineering team, product owner, designer  
**Primary market:** Indonesia-first individual/freelancer users

---

## 1. Product summary

DokMaker adalah web app untuk membuat invoice profesional dari template yang disediakan platform. User dapat membuat dan menyimpan draft invoice, melihat preview berbasis web, lalu membayar menggunakan saldo deposit hanya saat mengunduh PDF final.

Model bisnis inti:
- top up saldo/deposit
- preview gratis
- draft gratis
- bayar Rp10.000 hanya saat download final PDF
- download ulang gratis untuk versi invoice yang sama
- jika konten invoice berubah, versi baru harus dibayar lagi

---

## 2. Product goals

### 2.1 Business goals
- menciptakan model monetisasi per dokumen tanpa memaksa checkout di setiap aksi
- meningkatkan repeat usage lewat sistem deposit/wallet
- membangun fondasi platform dokumen berbayar yang bisa diperluas dari invoice ke dokumen lain

### 2.2 User goals
- membuat invoice profesional dengan cepat
- tidak perlu mendesain layout sendiri
- bisa cek hasil sebelum membayar
- bisa menyimpan draft dan mengakses histori
- bisa download ulang versi yang sama tanpa biaya tambahan

### 2.3 Product goals
- membangun flow end-to-end mobile-first yang stabil dari auth → draft → preview → top up → download final
- memastikan konsistensi transaksi saldo
- memastikan sistem siap diperluas ke template/dokumen lain

---

## 3. Non-goals

Tidak termasuk dalam MVP:
- upload template oleh user
- multi-document selain invoice
- team workspace / collaboration
- recurring invoices
- e-signature
- accounting integration
- tax engine kompleks
- custom domain/branding per user
- native mobile app
- anti-screenshot absolut
- marketplace template creator pihak ketiga
- AI auto-generate invoice content

---

## 4. Target users

### 4.1 Primary segment
Freelancer dan individual professional yang membutuhkan invoice cepat, rapi, dan profesional.

### 4.2 Key traits
- bukan designer
- ingin workflow cepat
- butuh hasil PDF profesional
- memiliki kebutuhan berulang membuat invoice
- bersedia memakai sistem saldo untuk mengurangi friksi pembayaran

---

## 5. Problem statement

Freelancer dan individual sering membuat invoice secara manual menggunakan Word, spreadsheet, atau template desain yang tidak efisien. Hasilnya sering tidak konsisten, kurang profesional, dan memakan waktu. Di sisi lain, model bayar per invoice via checkout tiap kali bisa menambah friksi.

DokMaker menyelesaikan ini dengan:
- template invoice siap pakai
- editor berbasis form
- preview sebelum bayar
- saldo deposit untuk download final

---

## 6. Value proposition

- invoice profesional dalam beberapa menit
- tidak perlu mengedit layout dokumen
- draft gratis, preview gratis
- bayar hanya saat perlu file final
- saldo deposit mempermudah transaksi berulang
- histori invoice dan transaksi tersimpan rapi

---

## 7. Success metrics

### 7.1 Product KPIs
- % user baru yang berhasil membuat preview invoice pertama
- median time dari login pertama ke preview pertama
- conversion rate dari preview ke paid download
- repeat paid download rate per user
- top up success rate
- invoice final download success rate

### 7.2 Reliability KPIs
- mismatch saldo/transaksi = 0 target
- duplicate charge incidents = 0 target
- failed final generation after successful charge < threshold kecil
- payment webhook duplicate handling success rate = 100%

### 7.3 Support KPIs
- jumlah komplain refund/charge ganda rendah
- rata-rata waktu investigasi dispute transaksi rendah karena audit trail lengkap

---

## 8. Scope

### 8.1 In scope — User
- register/login/logout
- reset password
- dashboard user
- wallet balance
- top up saldo dengan nominal paket Rp50.000 atau Rp100.000
- histori transaksi
- katalog template invoice
- create draft invoice
- edit draft invoice
- preview invoice
- paid download PDF final
- download history
- free re-download untuk versi yang sama

### 8.2 In scope — Admin
- admin auth/role
- CRUD template invoice
- set harga template
- aktif/nonaktif template
- lihat user dasar
- lihat invoice dasar
- lihat transaksi payment/wallet
- refund/adjustment manual
- audit log admin action

### 8.3 In scope — Platform
- invoice versioning
- protected final download access
- payment webhook verification
- idempotent financial operations
- PDF generation
- observability dasar

---

## 9. Assumptions

- platform dimulai untuk pasar Indonesia
- payment gateway mendukung top up flow + webhook
- template invoice dibuat dan dikurasi admin
- user menerima model preview gratis, bayar saat download final
- preview hanya bersifat deterrence, bukan anti-capture guarantee
- invoice versioning diperlukan untuk menjaga fairness monetisasi

---

## 10. Constraints

- AI team harus membangun sistem yang deterministik dan mudah diaudit
- semua operasi finansial harus server-side
- tidak boleh ada ketergantungan pada proteksi frontend untuk keamanan inti
- sistem harus bisa berkembang ke dokumen lain tanpa abstraction berlebihan di MVP
- implementasi harus mendahulukan boring architecture dibanding clever shortcuts

---

## 11. User journeys

### 11.1 Main happy path
1. user register/login
2. user membuka katalog template
3. user memilih template invoice
4. user mengisi form invoice
5. user menyimpan draft
6. user melihat preview
7. user melakukan top up jika saldo belum cukup
8. user klik download final PDF
9. sistem memotong saldo
10. sistem menghasilkan PDF final
11. user mengunduh PDF
12. jika butuh lagi tanpa perubahan, user dapat re-download gratis

### 11.2 Revision path
1. user membuka invoice yang sudah pernah dibayar
2. user mengubah konten invoice
3. sistem membuat active version baru yang unpaid
4. user preview revisi
5. user membayar lagi saat download final revisi

### 11.3 Insufficient balance path
1. user klik download
2. sistem mendeteksi saldo kurang
3. sistem menolak final generation berbayar
4. user diarahkan ke flow top up
5. setelah top up sukses, user bisa mencoba download lagi

---

## 12. Functional requirements

### FR-001 Authentication
- Sistem harus menyediakan registrasi user.
- Sistem harus menyediakan login/logout.
- Sistem harus menyediakan password reset.
- Sistem harus membatasi area `/app` untuk user terautentikasi.
- Sistem harus membedakan role `user` dan `admin`.

### FR-002 User dashboard
- Sistem harus menampilkan saldo user saat ini.
- Sistem harus menampilkan draft invoice terbaru.
- Sistem harus menampilkan histori transaksi terbaru.
- Sistem harus menampilkan histori download terbaru.
- Sistem harus menyediakan quick action untuk membuat invoice baru dan top up.

### FR-003 Template catalog
- Sistem harus menampilkan hanya template invoice yang aktif.
- Setiap template harus memiliki nama, deskripsi singkat, thumbnail, dan harga.
- User harus dapat memilih template dan memulai draft invoice baru.
- Admin harus dapat membuat, mengedit, mengaktifkan, dan menonaktifkan template.

### FR-004 Invoice drafting
- User harus dapat membuat invoice draft dari template terpilih.
- User harus dapat menyimpan draft.
- User harus dapat mengedit draft kapan saja.
- Sistem harus menyimpan data invoice dalam struktur yang dapat dirender secara konsisten.
- Data minimal invoice harus meliputi pengirim, klien, metadata invoice, line items, summary, dan notes.

### FR-005 Invoice versioning
- Setiap invoice harus memiliki active version.
- Sistem harus membedakan revisi konten invoice sebagai versi baru.
- Versi yang sudah dibayar harus tetap dapat diunduh ulang.
- Jika user mengubah konten setelah ada versi paid, active version baru harus berstatus unpaid.
- Sistem harus menyimpan snapshot konten per versi.

### FR-006 Preview
- Sistem harus menyediakan preview web untuk active version invoice.
- Preview harus diberi watermark dan label preview.
- Preview tidak boleh tersedia sebagai clean final asset.
- Preview URL harus memerlukan autentikasi dan validasi ownership.
- Preview harus merefleksikan data versi aktif terbaru yang tersimpan.

### FR-007 Wallet/deposit
- Sistem harus menampilkan current balance.
- Sistem harus mendukung top up melalui payment gateway.
- Semua mutasi saldo harus server-side only.
- Semua mutasi saldo harus tercatat sebagai ledger append-only.
- Admin harus dapat membuat adjustment/refund manual dengan audit trail.

### FR-008 Payment transactions
- Sistem harus membuat payment transaction untuk top up.
- Sistem harus menerima dan memproses webhook payment provider.
- Sistem harus memverifikasi webhook authenticity.
- Sistem harus memproses webhook secara idempotent.
- Saldo user hanya boleh bertambah setelah payment terverifikasi sukses.

### FR-009 Paid final download
- Saat user meminta final download untuk versi unpaid, sistem harus:
  - memvalidasi autentikasi
  - memvalidasi ownership
  - memvalidasi saldo cukup
  - mencegah charge paralel
  - membuat proses charge yang atomic
  - menghasilkan PDF final
  - menandai versi sebagai paid bila sukses
- Untuk versi yang sudah paid, sistem harus mengizinkan re-download gratis.
- Sistem harus mencatat setiap download di download log.

### FR-010 Error handling for charge/generation
- Jika final PDF generation gagal, sistem tidak boleh menyisakan state ambigu.
- Sistem harus memiliki jalur rollback/cancel untuk pending debit yang gagal.
- User harus menerima pesan error aman dan dapat ditindaklanjuti.
- Kegagalan harus tercatat untuk observability dan support.

### FR-011 Admin tooling
- Admin harus dapat melihat daftar user, invoice, payment transaction, dan wallet transaction.
- Admin harus dapat mengelola template.
- Admin harus dapat men-trigger refund/adjustment manual.
- Semua aksi sensitif admin harus tercatat di audit log.

### FR-012 Auditability
- Sistem harus menyimpan log untuk:
  - wallet mutation
  - payment webhook
  - final download
  - admin actions
  - generation failures
- Sistem harus memungkinkan penelusuran sengketa transaksi.

---

## 13. Business rules

### BR-001
Draft invoice gratis.

### BR-002
Preview invoice gratis.

### BR-003
Biaya dikenakan hanya saat download final PDF untuk active version yang belum paid. Harga MVP per final download adalah Rp10.000.

### BR-004
Satu versi invoice hanya boleh dikenakan biaya sekali.

### BR-005
Re-download versi yang sama gratis.

### BR-006
Perubahan konten invoice setelah versi paid akan menghasilkan versi baru yang unpaid.

### BR-007
Jika saldo user tidak cukup, download final harus ditolak dan user diarahkan ke top up.

### BR-011
Nominal top up MVP hanya tersedia dalam paket Rp50.000 dan Rp100.000.

### BR-008
Saldo tidak boleh dimutasi oleh frontend.

### BR-009
Semua transaksi finansial harus auditable dan idempotent bila applicable.

### BR-010
Preview bukan jaminan anti-screenshot; preview hanya deterrence layer.

---

## 14. Security requirements

### SEC-001 Auth & authorization
- semua endpoint sensitif harus memerlukan auth
- ownership invoice harus dicek di server
- admin/user permissions harus dipisahkan tegas

### SEC-002 Financial integrity
- semua wallet mutation harus server-side
- debit saldo + penandaan paid harus atomic
- duplicate charge harus dicegah
- duplicate webhook harus tidak berdampak finansial ganda

### SEC-003 File delivery
- final PDF tidak boleh berada di public permanent URL tanpa kontrol akses
- gunakan signed URL sementara atau backend stream
- preview dan final asset harus terpisah

### SEC-004 Abuse resistance
- rate limiting untuk endpoint sensitif
- idempotency/locking untuk final download charge flow
- audit log untuk aksi admin sensitif

### SEC-005 Data protection
- data invoice user hanya bisa diakses pemilik dan admin sesuai otorisasi
- gunakan HTTPS di semua environment deploy
- hindari logging berlebihan untuk data sensitif

---

## 15. Non-functional requirements

### NFR-001 Performance
- preview invoice normal target < 3 detik
- final PDF generation normal target < 10 detik
- dashboard tetap usable pada volume data user normal

### NFR-002 Reliability
- mismatch saldo/transaksi harus diupayakan nol
- payment webhook duplicate aman
- charge/download flow harus tahan klik ganda

### NFR-003 Maintainability
- domain finansial dan invoice harus dipisahkan modular
- perubahan template tidak boleh mengacaukan histori versi yang sudah dibayar
- audit trail harus mudah ditelusuri

### NFR-004 Scalability
- arsitektur data harus memungkinkan ekspansi ke dokumen lain
- namun MVP tidak boleh over-engineered menjadi platform generik penuh

### NFR-005 Observability
- error penting, webhook, debit, dan generation failures harus tercatat
- support/admin harus punya jejak yang cukup untuk investigasi

### NFR-006 Mobile-first PWA
- semua flow utama user harus usable pada viewport mobile 360px
- UI harus mobile-first, touch-friendly, dan bebas horizontal overflow
- aplikasi harus memiliki manifest PWA dan metadata installable
- caching PWA tidak boleh menyimpan data private/financial secara tidak aman
- aksi payment, wallet mutation, dan final download harus membutuhkan koneksi online

---

## 16. Sitemap

### Public
- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/pricing` (opsional)
- `/terms`
- `/privacy`

### Authenticated user
- `/app`
- `/app/templates`
- `/app/templates/:templateId`
- `/app/invoices`
- `/app/invoices/new?template=:templateId`
- `/app/invoices/:invoiceId/edit`
- `/app/invoices/:invoiceId/preview`
- `/app/invoices/:invoiceId/downloads`
- `/app/wallet`
- `/app/wallet/topup`
- `/app/wallet/transactions`
- `/app/payments`
- `/app/profile`

### Admin
- `/admin`
- `/admin/templates`
- `/admin/templates/new`
- `/admin/templates/:templateId/edit`
- `/admin/users`
- `/admin/users/:userId`
- `/admin/invoices`
- `/admin/invoices/:invoiceId`
- `/admin/transactions`
- `/admin/payments`
- `/admin/audit-logs`

---

## 17. Initial database entities

- `users`
- `wallets`
- `wallet_ledger_entries`
- `payment_transactions`
- `payment_webhook_events`
- `invoice_templates`
- `invoices`
- `invoice_versions`
- `download_logs`
- `admin_audit_logs`

---

## 18. Priority classification

### P0 — Must have
- auth
- dashboard basic
- template catalog
- invoice drafting
- preview
- wallet
- top up
- webhook verification
- paid final PDF download
- versioning
- transaction logs
- admin template CRUD
- admin transaction visibility

### P1 — Should have
- forgot password
- admin refund/adjustment tooling
- richer audit filtering
- improved preview deterrence

### P2 — Nice to have
- autosave
- draft duplication
- richer analytics
- more template filtering

---

## 19. MVP acceptance summary

A release can be considered MVP-ready only if:
1. user dapat register/login dan mengakses dashboard
2. user dapat top up dan saldo bertambah hanya setelah payment success
3. user dapat membuat draft invoice dari template aktif
4. user dapat preview invoice dengan watermark
5. user dapat download final PDF dengan potong saldo bila versi unpaid
6. user dapat re-download gratis untuk versi paid yang sama
7. edit setelah paid menghasilkan versi baru unpaid
8. duplicate charge dan duplicate webhook terlindungi
9. admin dapat mengelola template dan melihat transaksi
10. audit/logging dasar tersedia untuk investigasi
