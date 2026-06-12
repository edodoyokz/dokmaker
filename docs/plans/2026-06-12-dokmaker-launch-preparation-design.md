# DokMaker Launch Preparation Design

**Date:** 2026-06-12  
**Status:** Approved for implementation  
**Scope:** Production-launch preparation for existing DokMaker repository

## Goal

Menyiapkan repository DokMaker hingga layak disebut **production-launch preparation ready**: hardening area kritis, menutup gap readiness yang bisa diverifikasi, dan menghasilkan evidence + dokumentasi operasional yang cukup untuk deploy decision berikutnya.

## Non-goals

- Tidak langsung melakukan launch production live.
- Tidak mengklaim payment live siap tanpa credential, sandbox/live verification, dan deployment evidence.
- Tidak melakukan rewrite arsitektur besar.

## Current-state assumptions

- Repo sudah memiliki fondasi fitur utama: auth/session guard, invoice flow, wallet/topup, webhook, admin routes, Prisma schema, dan basic test suite.
- Masih ada gap antara “fitur ada” dan “launch-preparation ready”, terutama pada evidence, hardening, dan operational documentation.
- Launch-prep status harus berbasis verifikasi nyata, bukan checklist asumtif.

## Recommended approach

Gunakan pendekatan **safety-first incremental hardening**:

1. Audit readiness repo saat ini.
2. Tutup gap launch-critical satu per satu dengan TDD untuk perubahan perilaku.
3. Jalankan verifikasi wajib.
4. Dokumentasikan readiness, env contract, smoke evidence, dan rollback plan.

Pendekatan ini dipilih karena domain DokMaker mengandung auth, wallet, payment webhook, dan debit download yang sensitif terhadap race condition dan false confidence.

## Workstreams

### 1. Readiness audit
Fokus pada area:
- authz dan ownership enforcement
- financial invariants
- Pakasir verification behavior
- final PDF generation behavior
- secure final delivery
- admin/audit coverage
- readiness docs dan smoke evidence

Output:
- daftar gap prioritas
- status tiap area: pass / partial / blocked

### 2. Launch-critical hardening
Prioritas perubahan minimal namun aman:
- hilangkan fallback PDF yang menyesatkan untuk final output
- perkuat test coverage untuk behavior yang menjadi evidence gate
- rapikan warning/gap yang mempengaruhi readiness confidence
- tambahkan dokumentasi produksi yang belum ada

### 3. Verification and reporting
Wajib menghasilkan:
- command verification output
- readiness review doc
- environment checklist
- rollback/forward-fix plan
- staging/launch evidence template atau log

## Acceptance target

DokMaker dapat dinyatakan **launch-preparation ready** bila:
- codebase lolos lint, typecheck, tests, build, prisma validate, migrate status
- gap readiness utama yang ditemukan sudah ditutup atau didokumentasikan jujur sebagai blocker/risk
- readiness docs produksi tersedia
- rollback plan tersedia
- smoke evidence structure tersedia untuk staging/production execution berikutnya

## Risks

- Sebagian test saat ini mungkin masih lebih dekat ke specification tests daripada integration evidence.
- Tanpa deploy target/credential verification, status akhir tetap harus dibatasi pada launch preparation, bukan production-ready.
- Integrasi PDF/storage/payment bisa masih menyisakan gap environment-specific yang baru terlihat saat staging.

## Implementation transition

Langkah berikutnya adalah membuat implementation plan rinci lalu mengeksekusinya secara bertahap dengan fokus pada hardening yang paling mempengaruhi launch confidence.
