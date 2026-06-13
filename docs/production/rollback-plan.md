# DokMaker Rollback Plan

**Version:** v1.0
**Last Updated:** 2026-06-12

> **Launch-prep update (2026-06-12):** Idempotency guarantees for webhook crediting and download debit are now covered by regression tests (`tests/pakasir-webhook.test.ts`, `tests/download-flow.test.ts`). Prisma config (including seed) now lives in `prisma.config.ts` rather than `package.json#prisma`.

---

## 1. Overview

This document describes procedures for rolling back DokMaker in case of critical issues after deployment.

---

## 2. Rollback Triggers

Initiate rollback if:
- Users cannot login
- Invoice creation fails
- Payment webhook fails repeatedly
- Wallet balance inconsistencies detected
- PDF download fails for all users
- Security vulnerability discovered

---

## 3. Rollback Procedures

### 3.1 Application Rollback (Vercel)

**Time to rollback:** ~2 minutes

1. Go to Vercel Dashboard
2. Select DokMaker project
3. Go to Deployments
4. Find last known-good deployment
5. Click "..." → "Promote to Production"

**Alternative (CLI):**
```bash
npx vercel rollback
```

### 3.2 Database Rollback

**Important:** Database rollbacks are destructive. Prefer forward-fix.

**If rollback needed:**

1. **Stop application** (set Vercel to maintenance mode)
2. **Backup current state:**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```
3. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```
4. **For additive migrations:** Usually safe to keep
5. **For destructive migrations:** Restore from backup

**Forward-fix preferred:**
- Create new migration to fix issue
- Deploy fix instead of rolling back

### 3.3 Pakasir Webhook Rollback

**If webhook causing issues:**

1. **Disable webhook in Pakasir:**
   - Login to Pakasir dashboard
   - Go to project settings
   - Remove/disable webhook URL

2. **Manual reconciliation:**
   - Check `payment_webhook_events` table
   - Check `payment_transactions` status
   - Manually credit wallet if needed via admin

3. **Re-enable webhook:**
   - Fix application code
   - Deploy fix
   - Re-enable webhook in Pakasir

### 3.4 Emergency Contacts

| Service | Contact | Notes |
|---------|---------|-------|
| Vercel | Dashboard | Self-service |
| Supabase | Dashboard | Self-service |
| Pakasir | Support | For payment issues |
| Database | Provider support | For DB issues |

---

## 4. Communication Plan

### 4.1 During Rollback

1. **Status page:** Update with issue description
2. **Users:** Email if payment/wallet affected
3. **Team:** Notify via internal channel

### 4.2 After Rollback

1. **Post-mortem:** Document what happened
2. **Root cause:** Identify and fix
3. **Prevention:** Add tests/monitoring

---

## 5. Recovery Procedures

### 5.1 Payment Reconciliation

If wallet balances incorrect:

```sql
-- Check ledger sum vs balance
SELECT 
  w.user_id,
  w.current_balance,
  COALESCE(SUM(CASE WHEN wle.entry_type LIKE '%credit' THEN wle.amount ELSE -wle.amount END), 0) as calculated_balance
FROM wallets w
LEFT JOIN wallet_ledger_entries wle ON w.id = wle.wallet_id AND wle.status = 'success'
GROUP BY w.user_id, w.current_balance
HAVING w.current_balance != COALESCE(SUM(CASE WHEN wle.entry_type LIKE '%credit' THEN wle.amount ELSE -wle.amount END), 0);
```

### 5.2 Missing Webhook Recovery

```sql
-- Find successful payments not credited
SELECT pt.id, pt.provider_order_id, pt.amount, pt.user_id
FROM payment_transactions pt
LEFT JOIN wallet_ledger_entries wle ON wle.reference_id = pt.id AND wle.entry_type = 'topup_credit'
WHERE pt.status = 'success' 
AND wle.id IS NULL;
```

---

## 6. Testing Rollback

Quarterly rollback drill:
1. Deploy to staging
2. Simulate issue
3. Execute rollback
4. Verify recovery
5. Document time taken

---

## 7. Checklist

Before declaring rollback complete:

- [ ] Application serving responses
- [ ] Users can login
- [ ] Invoice creation works
- [ ] Payment webhook processing
- [ ] Wallet balances correct
- [ ] PDF download working
- [ ] Admin access working
- [ ] No error spikes in logs
