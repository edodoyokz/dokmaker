# DokMaker MVP Smoke Checklist

**Version:** v1.0  
**Status:** Draft for release verification  
**Payment gateway:** Pakasir  
**Scope:** Critical MVP flows only

---

## 1. Purpose

Checklist ini dipakai untuk membuktikan bahwa DokMaker MVP berjalan end-to-end sebelum diklaim siap demo/preview/production.

Tidak boleh klaim production-ready jika checklist kritis belum dijalankan atau masih gagal.

---

## 2. Required environment setup

### 2.1 App environment
Verify env tersedia:
- `DATABASE_URL`
- auth provider env vars
- `APP_BASE_URL`
- `PAKASIR_PROJECT_SLUG`
- `PAKASIR_API_KEY`
- `PAKASIR_BASE_URL=https://app.pakasir.com`
- `PAKASIR_WEBHOOK_URL`
- storage env vars jika PDF final disimpan di object storage

### 2.2 Pakasir project setup
Verify di dashboard Pakasir:
- project sudah dibuat
- project slug sudah benar
- API key tersedia
- webhook URL mengarah ke:
  ```text
  {APP_BASE_URL}/api/webhooks/pakasir
  ```
- mode sandbox/test aktif untuk development/staging jika tersedia

### 2.3 Seed data
Minimal seed:
- 1 admin user
- 1 regular user test
- 1 active invoice template
- 1 inactive invoice template

---

## 3. Verification commands

Run sebelum manual smoke:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If Prisma is used:

```bash
npx prisma validate
npx prisma migrate status
```

Expected:
- all commands exit 0
- no type errors
- no failing tests
- migration status clean

---

## 4. Auth smoke tests

### AUTH-001 Register user
Steps:
1. Open `/register`
2. Register new test user
3. Verify redirected/logged in

Expected:
- user account created
- user can access `/app`
- user cannot access `/admin`

Status: `[ ] PASS / [ ] FAIL`

---

### AUTH-002 Login/logout
Steps:
1. Logout
2. Open `/login`
3. Login as test user
4. Logout again

Expected:
- login succeeds
- logout clears session
- logged out user cannot access `/app`

Status: `[ ] PASS / [ ] FAIL`

---

### AUTH-003 Admin route guard
Steps:
1. Login as admin
2. Open `/admin`
3. Login as regular user
4. Try `/admin`

Expected:
- admin can access admin area
- regular user is blocked

Status: `[ ] PASS / [ ] FAIL`

---

## 5. Template smoke tests

### TPL-001 User sees active templates only
Steps:
1. Login as user
2. Open `/app/templates`

Expected:
- active template appears
- inactive template does not appear
- template card shows name, thumbnail/placeholder, and price

Status: `[ ] PASS / [ ] FAIL`

---

### TPL-002 Admin can manage template
Steps:
1. Login as admin
2. Open `/admin/templates`
3. Create or edit template
4. Toggle active/inactive

Expected:
- template changes persist
- admin action is audited
- active status affects user catalog

Status: `[ ] PASS / [ ] FAIL`

---

## 6. Invoice drafting smoke tests

### INV-001 Create invoice draft
Steps:
1. Login as user
2. Open active template detail
3. Click use template
4. Fill invoice form:
   - sender
   - client
   - invoice number
   - issue date
   - due date
   - at least 1 item
   - notes/payment instruction
5. Save draft

Expected:
- invoice created
- version 1 created
- active version status is `unpaid`
- invoice appears in `/app/invoices`

Status: `[ ] PASS / [ ] FAIL`

---

### INV-002 Edit unpaid invoice
Steps:
1. Open unpaid invoice edit page
2. Change an item or note
3. Save

Expected:
- active version remains unpaid
- content updates correctly
- no paid status is created

Status: `[ ] PASS / [ ] FAIL`

---

## 7. Preview smoke tests

### PREV-001 Preview invoice
Steps:
1. Open invoice preview page

Expected:
- invoice renders correctly
- watermark `PREVIEW` appears
- user email/timestamp/version identifier appears if implemented
- preview is clearly not a clean final document

Status: `[ ] PASS / [ ] FAIL`

---

### PREV-002 Preview authorization
Steps:
1. Copy preview URL
2. Logout
3. Open preview URL
4. Login as another user and open same URL

Expected:
- logged out user blocked
- other user blocked with safe 403/404

Status: `[ ] PASS / [ ] FAIL`

---

## 8. Wallet and Pakasir top up smoke tests

### PAY-001 Create top up payment URL
Steps:
1. Login as user
2. Open `/app/wallet/topup`
3. Select top up amount
4. Submit

Expected:
- local `payment_transaction` created
- unique `provider_order_id` generated
- redirect URL points to Pakasir:
  ```text
  https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}
  ```
- if configured, URL includes `redirect=` and/or `qris_only=1`

Status: `[ ] PASS / [ ] FAIL`

---

### PAY-002 Pakasir payment simulation
Use Pakasir sandbox simulation if project is in sandbox mode.

Request shape:

```bash
curl -L 'https://app.pakasir.com/api/paymentsimulation' \
-H 'Content-Type: application/json' \
-d '{
  "project": "<PAKASIR_PROJECT_SLUG>",
  "order_id": "<ORDER_ID_FROM_PAYMENT_TRANSACTION>",
  "amount": <TOPUP_AMOUNT>,
  "api_key": "<PAKASIR_API_KEY>"
}'
```

Expected:
- Pakasir marks transaction as completed in sandbox
- Pakasir sends webhook to DokMaker webhook URL, or transaction detail shows completed

Status: `[ ] PASS / [ ] FAIL`

---

### PAY-003 Pakasir webhook credits wallet once
Steps:
1. Complete/simulate payment
2. Wait for webhook
3. Open `/app/wallet`
4. Open `/app/wallet/transactions`

Expected:
- payment status becomes `success`
- wallet balance increases by exact top up amount
- one `topup_credit` ledger entry exists
- webhook event logged as processed

Status: `[ ] PASS / [ ] FAIL`

---

### PAY-004 Duplicate Pakasir webhook safety
Steps:
1. Replay the same webhook body or trigger same simulation if possible
2. Check wallet balance and ledger

Expected:
- wallet balance does not increase twice
- no duplicate successful ledger credit
- duplicate event is ignored or safely processed idempotently

Status: `[ ] PASS / [ ] FAIL`

---

### PAY-005 Forged webhook body rejected
Steps:
1. Send webhook body with wrong amount or unknown order_id to `/api/webhooks/pakasir`
2. Check wallet balance

Expected:
- wallet balance unchanged
- event logged as failed/ignored
- no ledger credit
- server does not expose secret details

Status: `[ ] PASS / [ ] FAIL`

---

## 9. Paid final download smoke tests

### DL-001 Insufficient balance blocks download
Steps:
1. Use account with balance below template price
2. Open unpaid invoice preview/edit page
3. Click final download

Expected:
- download blocked
- no PDF final generated as paid artifact
- no debit ledger entry
- user is prompted to top up

Status: `[ ] PASS / [ ] FAIL`

---

### DL-002 Paid first download succeeds
Steps:
1. Ensure user balance >= template price
2. Open unpaid invoice
3. Click download final PDF

Expected:
- backend validates ownership
- active version becomes `paid`
- wallet debited exactly template price
- one `download_debit` ledger entry created
- final PDF is generated
- final PDF is delivered securely
- download log created with `wasPaidDownload=true`

Status: `[ ] PASS / [ ] FAIL`

---

### DL-003 Same version re-download is free
Steps:
1. Open same paid invoice version
2. Click download again

Expected:
- no new debit ledger entry
- balance unchanged
- final PDF accessible again
- download log created with `wasPaidDownload=false`

Status: `[ ] PASS / [ ] FAIL`

---

### DL-004 Edit paid invoice creates unpaid version
Steps:
1. Open invoice that has paid active version
2. Edit item/note/client data
3. Save
4. Open preview/download status

Expected:
- new active version created
- new active version is `unpaid`
- old paid version remains available historically
- next final download requires payment again

Status: `[ ] PASS / [ ] FAIL`

---

### DL-005 Concurrent download does not double charge
Steps:
1. Prepare unpaid invoice with sufficient balance
2. Trigger final download twice quickly or via concurrent requests
3. Check wallet ledger and balance

Expected:
- only one successful debit
- only one paid transition
- second request returns already paid, already processing, or same file safely

Status: `[ ] PASS / [ ] FAIL`

---

### DL-006 PDF generation failure recovery
Steps:
1. Simulate PDF generation failure if possible
2. Trigger final download
3. Check wallet and invoice version status

Expected:
- no successful debit if PDF generation fails before paid commit
- invoice version becomes retryable state such as `generation_failed`
- error logged
- user sees safe retry message

Status: `[ ] PASS / [ ] FAIL`

---

## 10. Admin operations smoke tests

### ADM-001 Admin transaction visibility
Steps:
1. Login as admin
2. Open `/admin/transactions`
3. Open `/admin/payments`

Expected:
- admin sees wallet ledger entries
- admin sees payment transactions
- data has enough references for investigation

Status: `[ ] PASS / [ ] FAIL`

---

### ADM-002 Manual adjustment/refund audit
Steps:
1. Login as admin
2. Create manual credit adjustment with reason
3. Check user wallet
4. Check audit log

Expected:
- wallet balance changes correctly
- ledger entry created
- admin audit log created with reason

Status: `[ ] PASS / [ ] FAIL`

---

## 11. Security smoke tests

### SEC-001 User cannot access another user's invoice
Steps:
1. Create invoice as user A
2. Login as user B
3. Try direct URL/API for user A invoice

Expected:
- request blocked with safe 403/404
- no invoice data leaked

Status: `[ ] PASS / [ ] FAIL`

---

### SEC-002 Final file not public permanent URL
Steps:
1. Download final PDF
2. Inspect returned URL or delivery method
3. Try URL after expiry if signed URL is used

Expected:
- file delivery is authorized
- permanent public URL is not exposed
- expired signed URL stops working if applicable

Status: `[ ] PASS / [ ] FAIL`

---

### SEC-003 Client cannot mutate balance
Steps:
1. Inspect frontend requests
2. Attempt to call wallet update directly if any route exists

Expected:
- no client-accessible direct balance mutation route exists
- all credits/debits go through payment/admin/download services

Status: `[ ] PASS / [ ] FAIL`

---

## 12. Final release evidence summary

Before release/demo handoff, record:

```text
Environment:
App URL:
Commit SHA:
Database migration status:
Pakasir mode: sandbox/live
Verification commands run:
Smoke tests passed:
Smoke tests failed:
Skipped checks and rationale:
Known residual risks:
Reviewer:
Date/time:
```

---

## 13. Hard stop conditions

Do not claim MVP-ready if any of these fail:
- auth route guard broken
- user can access other user's invoice
- webhook can credit wallet without transaction detail/local verification
- duplicate webhook double-credits wallet
- paid download can double-charge
- final file is public without authorization
- build/typecheck/tests fail without accepted rationale
