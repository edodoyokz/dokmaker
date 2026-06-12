# DokMaker MVP API Contract

**Version:** v1.0  
**Status:** Draft for implementation  
**Scope:** User app, admin app, payments, wallet, invoice, preview, and download flows.

---

## 1. API principles

- Semua endpoint sensitif wajib server-side auth check.
- Semua endpoint user wajib ownership check.
- Semua endpoint admin wajib role `admin`.
- Semua mutasi finansial wajib idempotent jika berhubungan dengan payment/download.
- Frontend tidak boleh mengubah saldo langsung.
- Response error tidak boleh membocorkan data user lain.
- Gunakan consistent response envelope.

---

## 2. Common response format

### Success
```json
{
  "ok": true,
  "data": {}
}
```

### Error
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable safe message",
    "details": {}
  }
}
```

---

## 3. Common error codes

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `INSUFFICIENT_BALANCE`
- `PAYMENT_REQUIRED`
- `ALREADY_PROCESSING`
- `ALREADY_PAID`
- `PDF_GENERATION_FAILED`
- `WEBHOOK_SIGNATURE_INVALID`
- `DUPLICATE_EVENT_IGNORED`
- `INTERNAL_ERROR`

---

## 4. Auth/session endpoints

Auth endpoint detail mengikuti provider final, tetapi aplikasi wajib menyediakan session resolver server-side untuk:

```ts
type CurrentUser = {
  id: string;
  email: string;
  fullName?: string | null;
  role: "user" | "admin";
};
```

Required helpers:
- `requireUser()`
- `requireAdmin()`
- `assertInvoiceOwnership(userId, invoiceId)`
- `assertWalletOwnership(userId, walletId)`

---

## 5. Template APIs

### GET `/api/templates`
List template aktif untuk user.

#### Auth
Required user session.

#### Response
```json
{
  "ok": true,
  "data": {
    "templates": [
      {
        "id": "tpl_123",
        "name": "Modern Invoice",
        "slug": "modern-invoice",
        "description": "Template invoice modern untuk freelancer.",
        "thumbnailUrl": "https://...",
        "priceAmount": 10000,
        "currency": "IDR"
      }
    ]
  }
}
```

---

### GET `/api/templates/:id`
Detail template aktif.

#### Auth
Required user session.

#### Response
```json
{
  "ok": true,
  "data": {
    "template": {
      "id": "tpl_123",
      "name": "Modern Invoice",
      "slug": "modern-invoice",
      "description": "Template invoice modern untuk freelancer.",
      "thumbnailUrl": "https://...",
      "priceAmount": 10000,
      "currency": "IDR",
      "templateSchema": {},
      "renderConfig": {}
    }
  }
}
```

---

## 6. Invoice APIs

### GET `/api/invoices`
List invoice milik user.

#### Auth
Required user session.

#### Query params
- `status` optional
- `limit` optional
- `cursor` optional

#### Response
```json
{
  "ok": true,
  "data": {
    "invoices": [
      {
        "id": "inv_123",
        "title": "Invoice ACME Januari",
        "templateId": "tpl_123",
        "status": "draft",
        "activeVersion": {
          "id": "ver_123",
          "versionNumber": 1,
          "status": "unpaid",
          "isPaid": false
        },
        "createdAt": "2026-06-12T00:00:00.000Z",
        "updatedAt": "2026-06-12T00:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

---

### POST `/api/invoices`
Create invoice draft dari template.

#### Auth
Required user session.

#### Request
```json
{
  "templateId": "tpl_123",
  "title": "Invoice ACME Januari",
  "content": {
    "sender": {},
    "client": {},
    "invoice": {},
    "items": [],
    "summary": {},
    "notes": ""
  }
}
```

#### Response
```json
{
  "ok": true,
  "data": {
    "invoiceId": "inv_123",
    "activeVersionId": "ver_123",
    "versionNumber": 1,
    "status": "unpaid"
  }
}
```

#### Validation
- `templateId` wajib template aktif.
- `content` wajib memenuhi invoice validation schema.

---

### GET `/api/invoices/:id`
Detail invoice milik user.

#### Auth
Required user session + ownership.

#### Response
```json
{
  "ok": true,
  "data": {
    "invoice": {
      "id": "inv_123",
      "title": "Invoice ACME Januari",
      "templateId": "tpl_123",
      "status": "draft",
      "activeVersionId": "ver_123",
      "activeVersion": {
        "id": "ver_123",
        "versionNumber": 1,
        "contentSnapshot": {},
        "contentHash": "hash",
        "status": "unpaid",
        "isPaid": false,
        "paidAt": null,
        "firstDownloadedAt": null
      }
    }
  }
}
```

---

### PUT `/api/invoices/:id`
Update invoice content/title.

#### Auth
Required user session + ownership.

#### Request
```json
{
  "title": "Invoice ACME Januari Revisi",
  "content": {
    "sender": {},
    "client": {},
    "invoice": {},
    "items": [],
    "summary": {},
    "notes": ""
  }
}
```

#### Business behavior
- Jika active version unpaid: update/overwrite active version snapshot.
- Jika active version paid: create new version unpaid and set as active.

#### Response
```json
{
  "ok": true,
  "data": {
    "invoiceId": "inv_123",
    "activeVersionId": "ver_124",
    "versionNumber": 2,
    "status": "unpaid",
    "createdNewVersion": true
  }
}
```

---

### GET `/api/invoices/:id/downloads`
List download logs invoice milik user.

#### Auth
Required user session + ownership.

#### Response
```json
{
  "ok": true,
  "data": {
    "downloads": [
      {
        "id": "dl_123",
        "invoiceVersionId": "ver_123",
        "wasPaidDownload": true,
        "deliveryMethod": "signed_url",
        "createdAt": "2026-06-12T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 7. Preview APIs/routes

### GET `/api/invoices/:id/preview`
Return preview render data or protected preview payload.

#### Auth
Required user session + ownership.

#### Response
```json
{
  "ok": true,
  "data": {
    "invoiceId": "inv_123",
    "versionId": "ver_123",
    "status": "unpaid",
    "watermark": {
      "label": "PREVIEW",
      "userEmail": "user@example.com",
      "timestamp": "2026-06-12T00:00:00.000Z"
    },
    "renderModel": {}
  }
}
```

---

## 8. Wallet APIs

### GET `/api/wallet`
Get current user wallet summary.

#### Auth
Required user session.

#### Response
```json
{
  "ok": true,
  "data": {
    "wallet": {
      "id": "wal_123",
      "currentBalance": 50000,
      "currency": "IDR"
    }
  }
}
```

---

### GET `/api/wallet/transactions`
List current user wallet ledger.

#### Auth
Required user session.

#### Query params
- `limit` optional
- `cursor` optional
- `type` optional

#### Response
```json
{
  "ok": true,
  "data": {
    "transactions": [
      {
        "id": "led_123",
        "entryType": "topup_credit",
        "amount": 50000,
        "status": "success",
        "referenceType": "payment_transaction",
        "referenceId": "pay_123",
        "description": "Top up saldo",
        "createdAt": "2026-06-12T00:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

---

## 9. Payment APIs

### POST `/api/payments/topup`
Create top up payment order.

#### Auth
Required user session.

#### Request
```json
{
  "amount": 50000,
  "currency": "IDR"
}
```

#### Response
```json
{
  "ok": true,
  "data": {
    "paymentId": "pay_123",
    "status": "pending",
    "amount": 50000,
    "currency": "IDR",
    "redirectUrl": "https://payment-provider/..."
  }
}
```

#### Validation
- amount must be one of allowed top up packages: `50000` or `100000`
- currency must be `IDR`

---

### GET `/api/payments`
List current user payments.

#### Auth
Required user session.

#### Response
```json
{
  "ok": true,
  "data": {
    "payments": [
      {
        "id": "pay_123",
        "provider": "pakasir",
        "amount": 50000,
        "currency": "IDR",
        "status": "success",
        "paidAt": "2026-06-12T00:00:00.000Z",
        "createdAt": "2026-06-12T00:00:00.000Z"
      }
    ]
  }
}
```

---

### GET `/api/payments/:id`
Get current user payment detail.

#### Auth
Required user session + ownership.

---

## 10. Payment webhook API

### POST `/api/webhooks/pakasir`
Receive Pakasir webhook.

#### Auth
No user auth. Must verify event by local transaction match and Pakasir Transaction Detail API.

#### Expected Pakasir webhook body
```json
{
  "amount": 22000,
  "order_id": "TOPUP-20260612-A7K9Q2",
  "project": "dokmaker",
  "status": "completed",
  "payment_method": "qris",
  "completed_at": "2024-09-10T08:07:02.819+07:00"
}
```

#### Behavior
1. Persist webhook event.
2. Detect duplicate event/reference/order id.
3. Verify local `payment_transaction` exists for `order_id`.
4. Verify webhook `project`, `amount`, and `status` match expected values.
5. Call Pakasir Transaction Detail API server-side:
   `GET https://app.pakasir.com/api/transactiondetail?project={slug}&amount={amount}&order_id={order_id}&api_key={api_key}`
6. If Pakasir transaction detail confirms `status=completed` and local payment is not already applied:
   - update payment transaction to `success`
   - credit wallet ledger
   - update wallet balance
   - mark webhook processed
7. Return 2xx for processed or safely ignored duplicate events.

#### Security note
Pakasir docs sample does not show webhook signature. Do not credit wallet from webhook body alone; always verify through Transaction Detail API using server-side API key.

#### Response
```json
{
  "ok": true,
  "data": {
    "processingStatus": "processed"
  }
}
```

---

## 11. Final download API

### POST `/api/invoices/:id/download`
Start or return final PDF download for active version.

#### Auth
Required user session + ownership.

#### Request
```json
{
  "idempotencyKey": "client-generated-or-server-issued-key"
}
```

#### Behavior
- If active version is paid:
  - return secure file delivery for free re-download
  - log download with `wasPaidDownload=false`
- If active version is unpaid:
  - check balance
  - lock invoice version / ensure not processing
  - generate PDF
  - debit wallet atomically
  - mark version paid
  - save file key
  - log download with `wasPaidDownload=true`

#### Response paid first download
```json
{
  "ok": true,
  "data": {
    "invoiceId": "inv_123",
    "versionId": "ver_123",
    "wasPaidDownload": true,
    "amountCharged": 10000,
    "currency": "IDR",
    "downloadUrl": "https://signed-url/...",
    "expiresAt": "2026-06-12T00:10:00.000Z"
  }
}
```

#### Response free re-download
```json
{
  "ok": true,
  "data": {
    "invoiceId": "inv_123",
    "versionId": "ver_123",
    "wasPaidDownload": false,
    "amountCharged": 0,
    "currency": "IDR",
    "downloadUrl": "https://signed-url/...",
    "expiresAt": "2026-06-12T00:10:00.000Z"
  }
}
```

#### Important errors
- `INSUFFICIENT_BALANCE`
- `ALREADY_PROCESSING`
- `PDF_GENERATION_FAILED`
- `FORBIDDEN`

---

## 12. Admin APIs

All admin APIs require admin session.

### GET `/api/admin/templates`
List all templates.

### POST `/api/admin/templates`
Create template.

#### Request
```json
{
  "name": "Modern Invoice",
  "slug": "modern-invoice",
  "description": "Template invoice modern.",
  "thumbnailStorageKey": "templates/modern.png",
  "priceAmount": 10000,
  "currency": "IDR",
  "status": "active",
  "templateSchema": {},
  "renderConfig": {}
}
```

### PUT `/api/admin/templates/:id`
Update template.

---

### GET `/api/admin/users`
List users.

### GET `/api/admin/users/:id`
User detail with wallet summary.

---

### GET `/api/admin/invoices`
List invoices for support investigation.

### GET `/api/admin/invoices/:id`
Invoice detail.

---

### GET `/api/admin/transactions`
List wallet ledger entries.

### GET `/api/admin/payments`
List payment transactions.

---

### POST `/api/admin/wallet-adjustments`
Create manual wallet adjustment.

#### Request
```json
{
  "userId": "usr_123",
  "type": "manual_adjustment_credit",
  "amount": 10000,
  "currency": "IDR",
  "reason": "Support adjustment for payment issue"
}
```

#### Rules
- reason required
- audit log required
- ledger entry required

---

### POST `/api/admin/refunds`
Create refund/credit action.

#### Request
```json
{
  "userId": "usr_123",
  "referenceType": "invoice_version",
  "referenceId": "ver_123",
  "amount": 10000,
  "currency": "IDR",
  "reason": "PDF generation issue"
}
```

---

## 13. Invoice content shape

```json
{
  "sender": {
    "name": "Freelancer Name",
    "address": "Address",
    "email": "sender@example.com",
    "phone": "+628...",
    "businessId": "optional"
  },
  "client": {
    "name": "Client Name",
    "address": "Client Address",
    "email": "client@example.com",
    "phone": "+628...",
    "contactPerson": "optional"
  },
  "invoice": {
    "number": "INV-001",
    "issueDate": "2026-06-12",
    "dueDate": "2026-06-20",
    "currency": "IDR",
    "paymentTerms": "Due on receipt"
  },
  "items": [
    {
      "description": "Design service",
      "quantity": 1,
      "unitPrice": 500000,
      "amount": 500000
    }
  ],
  "summary": {
    "subtotal": 500000,
    "taxLabel": "PPN",
    "taxRate": 0,
    "taxAmount": 0,
    "discountAmount": 0,
    "grandTotal": 500000
  },
  "notes": "Thank you",
  "paymentInstruction": "Transfer to ..."
}
```

---

## 14. Required tests per API group

### Templates
- active-only list
- inactive detail hidden for user
- admin can manage all statuses

### Invoices
- create from active template
- reject inactive template
- ownership enforced
- paid edit creates new version

### Wallet/payments
- top up creates payment transaction
- webhook success credits once
- duplicate webhook ignored safely
- forged webhook body rejected because transaction detail/local checks fail

### Download
- insufficient balance rejected
- paid first download charges once
- re-download free
- concurrent requests do not double charge
- generation failure safe

### Admin
- user cannot access admin APIs
- admin financial action creates audit log
