# DokMaker Smoke Test Execution Report

**Date:** _______________
**Environment:** _______________
**Commit SHA:** _______________
**Deployed URL:** _______________

---

## 1. Verification Commands

```bash
# Run these first
npm run lint        # Result: ____
npm run typecheck   # Result: ____
npm test            # Result: ____
npm run build       # Result: ____
npx prisma validate # Result: ____
```

---

## 2. Auth Smoke Tests

### AUTH-001: Register new user
- [ ] Open `/register`
- [ ] Enter email, password, name
- [ ] Click Register
- **Expected:** Redirected to `/app`
- **Result:** PASS / FAIL
- **Notes:** _______________

### AUTH-002: Login
- [ ] Logout
- [ ] Open `/login`
- [ ] Enter credentials
- [ ] Click Login
- **Expected:** Redirected to `/app`
- **Result:** PASS / FAIL
- **Notes:** _______________

### AUTH-003: Route protection
- [ ] Logout
- [ ] Try accessing `/app` directly
- **Expected:** Redirected to `/login`
- [ ] Try accessing `/admin` directly
- **Expected:** Redirected to `/login`
- **Result:** PASS / FAIL
- **Notes:** _______________

---

## 3. Template Smoke Tests

### TPL-001: View templates
- [ ] Login as user
- [ ] Open `/app/templates`
- **Expected:** Active templates shown, inactive hidden
- **Result:** PASS / FAIL
- **Notes:** _______________

### TPL-002: Template detail
- [ ] Click on a template
- **Expected:** Detail page with name, description, price, CTA
- **Result:** PASS / FAIL
- **Notes:** _______________

---

## 4. Invoice Smoke Tests

### INV-001: Create invoice
- [ ] Click "Gunakan Template Ini"
- [ ] Fill form: sender, client, invoice number, items
- [ ] Click Save
- **Expected:** Invoice created, redirected to invoice list
- **Result:** PASS / FAIL
- **Notes:** _______________

### INV-002: Edit invoice
- [ ] Click on invoice
- [ ] Modify an item
- [ ] Click Save
- **Expected:** Changes saved
- **Result:** PASS / FAIL
- **Notes:** _______________

### INV-003: Preview invoice
- [ ] Click Preview button
- **Expected:** Invoice rendered with PREVIEW watermark
- **Result:** PASS / FAIL
- **Notes:** _______________

---

## 5. Wallet Smoke Tests

### WAL-001: View wallet
- [ ] Open `/app/wallet`
- **Expected:** Balance shown (0 for new user), empty transaction list
- **Result:** PASS / FAIL
- **Notes:** _______________

### WAL-002: Top up flow
- [ ] Click Top Up
- [ ] Select Rp50.000
- [ ] Click "Bayar dengan Pakasir"
- **Expected:** Redirected to Pakasir payment page
- **Result:** PASS / FAIL
- **Notes:** _______________

### WAL-003: Payment webhook (sandbox)
- [ ] Complete payment on Pakasir (sandbox)
- [ ] Wait for webhook
- [ ] Check wallet balance
- **Expected:** Balance increased by top up amount
- **Result:** PASS / FAIL / SKIP (no sandbox)
- **Notes:** _______________

---

## 6. Download Smoke Tests

### DL-001: Insufficient balance
- [ ] Ensure balance < Rp10.000
- [ ] Try to download invoice
- **Expected:** Error message about insufficient balance
- **Result:** PASS / FAIL
- **Notes:** _______________

### DL-002: Paid download
- [ ] Ensure balance >= Rp10.000
- [ ] Download invoice
- **Expected:** PDF downloaded, balance debited
- **Result:** PASS / FAIL / SKIP (no balance)
- **Notes:** _______________

### DL-003: Re-download
- [ ] Download same invoice again
- **Expected:** Free re-download, no debit
- **Result:** PASS / FAIL / SKIP
- **Notes:** _______________

---

## 7. Admin Smoke Tests

### ADM-001: Admin access
- [ ] Login as admin user
- [ ] Open `/admin`
- **Expected:** Admin dashboard visible
- [ ] Try as regular user
- **Expected:** Access denied / redirect
- **Result:** PASS / FAIL
- **Notes:** _______________

### ADM-002: Admin template management
- [ ] Open `/admin/templates`
- [ ] Toggle template status
- **Expected:** Status changes, audit logged
- **Result:** PASS / FAIL
- **Notes:** _______________

---

## 8. Summary

| Category | Tests | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Auth | 3 | | | |
| Templates | 2 | | | |
| Invoices | 3 | | | |
| Wallet | 3 | | | |
| Downloads | 3 | | | |
| Admin | 2 | | | |
| **Total** | **16** | | | |

---

## 9. Critical Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| | | |

---

## 10. Sign-off

- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Ready for production: YES / NO

**Tester:** _______________
**Date:** _______________
