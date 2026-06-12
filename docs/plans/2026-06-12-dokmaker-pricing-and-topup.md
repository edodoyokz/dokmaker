# DokMaker MVP Pricing and Top Up Rules

**Version:** v1.0  
**Status:** Final business decision for MVP  
**Date:** 2026-06-12

---

## 1. Final download price

Harga per paid final download untuk MVP adalah:

```text
Rp10.000 per invoice version final PDF download
```

Rules:
- User tidak membayar saat membuat draft.
- User tidak membayar saat preview.
- User membayar Rp10.000 saat pertama kali download final PDF untuk invoice version yang belum paid.
- Re-download invoice version yang sama gratis.
- Jika invoice yang sudah paid diedit, sistem membuat version baru unpaid.
- Download final version baru tersebut dikenakan biaya Rp10.000 lagi.

---

## 2. Top up packages

MVP hanya menyediakan nominal top up berikut:

```text
Rp50.000
Rp100.000
```

Rules:
- User tidak boleh input nominal top up bebas.
- API top up harus menolak nominal selain `50000` dan `100000`.
- Currency hanya `IDR` untuk MVP.
- Nominal disimpan sebagai integer Rupiah.

---

## 3. UX implications

### Wallet top up page
Tampilkan 2 kartu/pilihan:
- Top up Rp50.000
- Top up Rp100.000

### Download CTA
Jika invoice version belum paid:
- tampilkan harga: `Download final PDF — Rp10.000`

Jika invoice version sudah paid:
- tampilkan: `Download ulang gratis`

Jika saldo kurang:
- tampilkan pesan: `Saldo tidak cukup. Silakan top up Rp50.000 atau Rp100.000.`

---

## 4. API validation rules

### Top up
Allowed values:
```ts
const ALLOWED_TOPUP_AMOUNTS = [50000, 100000] as const;
```

Validation:
- `amount` must be exactly `50000` or `100000`
- `currency` must be `IDR`

### Paid download
Download price constant:
```ts
const FINAL_DOWNLOAD_PRICE = 10000;
```

Validation:
- wallet balance must be `>= 10000`
- debit amount must equal `10000`
- same paid version must not create additional debit

---

## 5. Pakasir implications

When creating Pakasir payment URL:

```text
https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}
```

`amount` must be either:
- `50000`
- `100000`

Do not generate Pakasir URL for arbitrary top up amount.

---

## 6. Test cases

Required tests:
- top up amount `50000` accepted
- top up amount `100000` accepted
- top up amount `10000` rejected
- top up amount `75000` rejected
- paid download debits exactly `10000`
- re-download same version debits `0`
- edit paid invoice then download new version debits `10000`
- insufficient balance below `10000` blocks final download
