# Preview–Download Render Parity Design

**Date:** 2026-07-10
**Status:** Approved

## Goal

Preview dan PDF download baru harus mempunyai isi, ukuran halaman, font, posisi, spacing, dan page break yang sama. Satu-satunya perbedaan yang diizinkan adalah preview menampilkan watermark/meta pengguna, sedangkan PDF final tidak.

## Current state

Kedua jalur sudah memakai template tersimpan dan `renderDocumentTemplateHtml()`, tetapi lingkungan render berbeda:

- Preview memasukkan fragment HTML template ke `<div>` dalam halaman aplikasi selebar tetap 794px.
- PDF membungkus fragment tersebut sebagai dokumen HTML lalu Chromium mencetaknya sebagai A4.
- CSS aplikasi dapat memengaruhi preview, sedangkan PDF berjalan dalam dokumen terisolasi.
- PDF versi paid yang telah memiliki `storageKey` dibaca dari artifact privat dan tidak boleh diregenerasi.

## Design

### Single render document

Tambahkan satu fungsi server/client-safe yang menghasilkan dokumen HTML lengkap dari template dan content. Fungsi ini menjadi sumber bagi preview dan `generateInvoiceHtml()` sehingga keduanya memakai doctype, meta viewport, reset CSS, ukuran A4, dan body yang sama.

Mode render hanya mengontrol nilai placeholder berikut:

- `{{preview.watermark}}`
- `{{preview.meta}}`

Semua placeholder data, struktur template, dan CSS lain identik.

### Isolated preview

Tampilkan dokumen preview melalui `iframe srcDoc`, bukan `dangerouslySetInnerHTML` di DOM aplikasi. Ini mencegah Tailwind/global CSS aplikasi mengubah layout template. Dokumen internal tetap berukuran A4; container luar menangani overflow horizontal pada viewport kecil tanpa mengubah geometri dokumen.

Tidak ditambahkan PDF preview endpoint atau proses Chromium saat membuka preview.

### Watermark geometry

Watermark/meta preview harus berupa overlay `position: fixed` atau `absolute`, tidak mengambil ruang dalam normal flow. Dengan begitu, menghilangkannya pada mode final tidak menggeser elemen atau page break.

### Existing artifacts

Perubahan hanya berlaku untuk PDF yang dibuat setelah deployment. Paid artifact yang telah tersimpan tetap immutable dan re-download tetap membaca `storageKey` yang sudah ada.

## Safety

- Template tetap berasal dari admin/platform.
- Content pengguna tetap melewati schema dan HTML escaping yang ada.
- Iframe memakai sandbox minimum dan tidak diberi kemampuan script/navigation.
- Alur wallet, debit, download authorization, dan storage privat tidak berubah.

## Verification

Automated checks membuktikan:

1. Dokumen preview dan final identik setelah node watermark/meta preview dihapus.
2. Watermark/meta berada di luar document flow.
3. Preview component memakai dokumen lengkap yang sama dengan PDF generator.
4. PDF generator masih menerima dokumen yang sama melalui `page.setContent()`.
5. Focused tests, lint, typecheck, full tests, dan build lulus.

Manual smoke membandingkan preview dan PDF baru untuk invoice serta GoCar receipt pada desktop dan mobile. Artifact paid lama tidak masuk acceptance test regenerasi.
