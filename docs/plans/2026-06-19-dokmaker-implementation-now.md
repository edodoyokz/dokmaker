# DokMaker Implementation Now

## Tujuan

Menyempurnakan DokMaker dari MVP yang sudah berjalan menjadi lebih aman, siap diuji end-to-end, dan lebih dekat ke kebutuhan produk: PWA mobile-first untuk membuat invoice dari template, top up wallet, preview watermark, dan paid final PDF download.

## Status saat ini

- Struktur project sudah modular dengan domain auth, invoices, wallet, payments, downloads, admin, dan audit.
- Prisma schema sudah mencakup user, wallet, ledger, payment transaction, webhook event, invoice template, invoice, invoice version, download log, dan admin audit log.
- API utama sudah tersedia untuk invoice, download, wallet topup, webhook Pakasir, dan admin template.
- Business rule inti sudah ada: invoice versioning, paid/unpaid version, re-download gratis, debit wallet, ledger idempotency, dan ownership check.
- Test suite sudah hijau: 10 test files dan 82 tests passed.

## Prioritas implementasi sekarang

### 1. Hardening paid download dan wallet debit

Fokus:
- Cegah double charge pada request download paralel.
- Pastikan balance check dan debit benar-benar atomic.
- Pastikan satu invoice version hanya bisa dikenakan biaya satu kali.

Rencana teknis:
- Tambahkan guard status `processing_payment` atau mekanisme atomic conditional update sebelum debit.
- Ubah flow unpaid download menjadi:
  1. Lock atau klaim invoice version unpaid.
  2. Generate PDF.
  3. Debit wallet dengan idempotency key berbasis invoice version.
  4. Mark version sebagai `paid`.
  5. Catat download log.
- Jika PDF generation gagal, jangan debit saldo.
- Jika transaksi gagal setelah debit, pastikan ada recovery path atau error handling yang jelas.

File utama:
- `src/modules/downloads/service.ts`
- `src/modules/wallet/service.ts`
- `tests/download-flow.test.ts`
- `tests/race-conditions.test.ts`

### 2. Audit API route untuk validasi dan authorization

Fokus:
- Semua endpoint harus memvalidasi input.
- Semua akses data user harus melewati ownership check.
- Semua endpoint admin harus memeriksa role admin.

Endpoint yang perlu diaudit:
- `src/app/api/invoices/route.ts`
- `src/app/api/invoices/[invoiceId]/route.ts`
- `src/app/api/invoices/[invoiceId]/download/route.ts`
- `src/app/api/wallet/topup/route.ts`
- `src/app/api/webhooks/pakasir/route.ts`
- `src/app/api/admin/templates/route.ts`
- `src/app/api/admin/templates/[templateId]/route.ts`

Checklist:
- Gunakan Zod untuk body dan params.
- Jangan percaya `userId` dari client.
- Ambil user dari session server-side.
- Return error response konsisten.
- Jangan leak detail internal pada error produksi.

### 3. Lengkapi UX mobile end-to-end

Fokus:
- User bisa menyelesaikan alur utama dari mobile tanpa kebingungan.

Flow utama:
1. Login atau register.
2. Lihat template aktif.
3. Buat invoice draft.
4. Edit isi invoice.
5. Preview dengan watermark.
6. Top up saldo.
7. Download PDF final.
8. Re-download versi yang sama secara gratis.
9. Edit invoice paid dan mendapatkan versi baru unpaid.

Halaman prioritas:
- `src/app/app/templates/page.tsx`
- `src/app/app/invoices/page.tsx`
- `src/app/app/invoices/new/page.tsx`
- `src/app/app/invoices/[invoiceId]/edit/page.tsx`
- `src/app/app/invoices/[invoiceId]/preview/page.tsx`
- `src/app/app/wallet/page.tsx`
- `src/app/app/wallet/topup/page.tsx`

### 4. Perkuat admin operational view

Fokus:
- Admin bisa melihat kondisi transaksi dan template dengan cepat.

Prioritas:
- Template list dan CRUD.
- Payment transaction list.
- Wallet ledger view.
- Invoice list.
- Audit log untuk aksi sensitif.

Halaman prioritas:
- `src/app/admin/templates/page.tsx`
- `src/app/admin/transactions/page.tsx`
- `src/app/admin/payments/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/invoices/page.tsx`

### 5. Production readiness

Command wajib sebelum klaim selesai:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
```

Kriteria selesai:
- Critical user journey berjalan end-to-end.
- Duplicate webhook tidak double-credit.
- Duplicate download tidak double-debit.
- Authz dan data isolation test pass.
- Build, lint, typecheck, dan test pass.
- Tidak ada final PDF yang disajikan sebagai public permanent URL.

## Urutan kerja hari ini

1. Hardening `processDownload` dan `debitWallet` untuk mencegah race condition.
2. Tambah atau update test untuk concurrent download dan double debit.
3. Audit API download dan invoice route untuk Zod validation dan ownership.
4. Jalankan `npm test`, `npm run typecheck`, dan `npm run lint`.
5. Catat hasil verifikasi dan residual risk.

## Risiko tersisa

- Integrasi Pakasir tetap perlu diverifikasi dengan sandbox atau live equivalent.
- Final file delivery perlu dipastikan memakai backend streaming atau signed temporary URL.
- UI mobile perlu dicek manual pada viewport 360px.
- Production readiness belum boleh diklaim sampai smoke checklist selesai dengan evidence.
