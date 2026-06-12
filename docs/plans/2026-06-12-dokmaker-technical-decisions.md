# DokMaker MVP Technical Decisions

**Version:** v1.0  
**Status:** Updated after payment gateway decision  
**Date:** 2026-06-12

---

## 1. Finalized decisions

| Area | Decision | Notes |
|---|---|---|
| App framework | Next.js | Modular monolith fullstack mobile-first PWA |
| Auth provider | Supabase Auth | Integrated with PostgreSQL; RLS available for data isolation |
| PWA | Required | Installable app with manifest, icons, conservative caching |
| UX target | Mobile-first | Primary user flows optimized for mobile viewport first |
| Language | TypeScript | Required for safer AI-team implementation |
| UI | Tailwind CSS + shadcn/ui | Fast dashboard/admin development |
| Database | PostgreSQL | Required for transactional wallet/payment safety |
| ORM | Prisma | Type-safe schema and migrations |
| Payment gateway | Pakasir | User selected Pakasir docs: https://pakasir.com/p/docs |
| Download price | Rp10.000 per paid final download | Same-version re-download remains free |
| Top up packages | Rp50.000 and Rp100.000 only | MVP does not allow arbitrary top up amount |
| Currency | IDR | Store amounts as integer Rupiah |
| Storage | S3-compatible / Cloudflare R2 recommended | For final PDFs and template thumbnails |
| PDF generation | HTML/CSS to PDF via Puppeteer/Playwright | Preview and final PDF can share render layout |
| Deploy target | Vercel recommended | With managed PostgreSQL |
| MVP documents | Invoice only | Admin-provided templates only |

---

## 2. Pakasir integration decision

DokMaker akan memakai **Pakasir** sebagai payment gateway untuk saldo/top up.

### Required Pakasir project credentials
From Pakasir project dashboard:
- `Slug`
- `Api Key`
- Webhook URL setting

### Required environment variables
```env
PAKASIR_PROJECT_SLUG=""
PAKASIR_API_KEY=""
PAKASIR_BASE_URL="https://app.pakasir.com"
PAKASIR_WEBHOOK_URL="https://your-domain.com/api/webhooks/pakasir"
PAKASIR_QRIS_ONLY="0"
```

Do not expose `PAKASIR_API_KEY` to client-side code.

---

## 3. Pakasir integration options

Pakasir supports two practical integration modes:

### Option A — Payment URL redirect
Redirect user to:

```text
https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}
```

Optional custom redirect:

```text
https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}&redirect={redirect_url}
```

Optional QRIS-only:

```text
https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}&qris_only=1
```

### Option B — API transaction create
Create transaction via:

```http
POST https://app.pakasir.com/api/transactioncreate/{method}
Content-Type: application/json
```

Request:

```json
{
  "project": "depodomain",
  "order_id": "INV123123",
  "amount": 99000,
  "api_key": "xxx123"
}
```

Payment methods documented:
- `qris`
- `cimb_niaga_va`
- `bni_va`
- `sampoerna_va`
- `bnc_va`
- `maybank_va`
- `permata_va`
- `atm_bersama_va`
- `artha_graha_va`
- `bri_va`

---

## 4. Recommended Pakasir approach for MVP

Use **Payment URL redirect** first for simplicity.

Why:
- easiest to implement
- less custom payment UI
- user can complete payment on Pakasir page
- DokMaker only needs to generate order, redirect URL, and process webhook/status checks

Recommended flow:
1. user chooses top up amount
2. DokMaker creates local `payment_transaction` with unique `order_id`
3. DokMaker returns Pakasir payment URL
4. user pays on Pakasir
5. Pakasir sends webhook to DokMaker
6. DokMaker verifies payment by checking local order and calling Pakasir transaction detail API
7. DokMaker credits wallet once

---

## 5. Pakasir webhook behavior

Pakasir sends HTTP `POST` to configured webhook URL with body similar to:

```json
{
  "amount": 22000,
  "order_id": "240910HDE7C9",
  "project": "depodomain",
  "status": "completed",
  "payment_method": "qris",
  "completed_at": "2024-09-10T08:07:02.819+07:00"
}
```

Important docs note:
- On webhook receive, verify `amount` and `order_id` against local transaction.
- Pakasir recommends using Transaction Detail API for more valid status checking.

Therefore DokMaker must not credit wallet from webhook body alone.

---

## 6. Pakasir transaction detail verification

Use:

```http
GET https://app.pakasir.com/api/transactiondetail?project={slug}&amount={amount}&order_id={order_id}&api_key={api_key}
```

Expected completed response shape:

```json
{
  "transaction": {
    "amount": 22000,
    "order_id": "240910HDE7C9",
    "project": "depodomain",
    "status": "completed",
    "payment_method": "qris",
    "completed_at": "2024-09-10T08:07:02.819+07:00"
  }
}
```

Wallet credit rule:
- only credit when local payment exists
- local amount matches Pakasir amount
- local order id matches Pakasir order id
- project matches configured slug
- transaction detail status is `completed`
- payment has not been applied before

---

## 7. Pakasir sandbox/testing

Pakasir supports payment simulation for sandbox projects:

```http
POST https://app.pakasir.com/api/paymentsimulation
Content-Type: application/json
```

Request:

```json
{
  "project": "depodomain",
  "order_id": "INV123123",
  "amount": 99000,
  "api_key": "xxx123"
}
```

Use this for smoke testing top up flow in development/staging.

---

## 8. Payment transaction identifiers

DokMaker should generate internal payment IDs and Pakasir `order_id`.

Recommended `order_id` format:

```text
TOPUP-{yyyyMMdd}-{shortRandom}
```

Example:

```text
TOPUP-20260612-A7K9Q2
```

Rules:
- unique per payment transaction
- stored in `payment_transactions.provider_order_id`
- never reused
- included in Pakasir payment URL

---

## 9. Payment status mapping

| Pakasir status | DokMaker status |
|---|---|
| `completed` | `success` |
| unknown/pending/no transaction | `pending` or unchanged |
| cancelled by local API | `cancelled` |
| expired if implemented locally | `expired` |
| failed provider result | `failed` |

Because Pakasir webhook docs emphasize `completed`, MVP should treat only `completed` as balance-crediting success.

---

## 10. Security implications

Pakasir webhook sample does not show a webhook signature field. Therefore DokMaker must compensate with:
- verify local `order_id`
- verify amount
- verify project slug
- call Pakasir Transaction Detail API using server-side API key
- idempotency guard in DB
- never credit from webhook body alone

If Pakasir provides webhook signature in dashboard or future docs, add signature verification before detail API verification.

---

## 11. Open decisions remaining

1. Auth provider: Auth.js vs Clerk
2. Storage provider: Cloudflare R2 vs Supabase Storage vs S3
3. PDF engine: Puppeteer vs Playwright
4. Whether to force QRIS-only in Pakasir URL
5. Whether to use Pakasir API create flow after MVP redirect flow
6. Autosave: include in MVP or P2
7. Service worker library: next-pwa vs custom minimal service worker
8. Supabase RLS policies for invoice/wallet data isolation
