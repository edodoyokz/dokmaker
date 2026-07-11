# DokMaker Financial Security Audit

**Date:** 2026-07-11  
**Scope:** Bypass paths that can cause **wallet loss** (free final PDF, double credit, free AI, unpaid re-download abuse).  
**Method:** Manual code review of money paths + existing financial tests.  
**Baseline tests run:** `download-flow`, `pakasir-webhook`, `wallet-debit-race`, `ai-invoice-service`, `admin-adjust-idempotency` → **49 passed**.

---

## 1. Attack surface (money)

| Surface | Entry | Risk if broken |
|--------|--------|----------------|
| Final PDF download | `GET /api/invoices/:id/download` → `processDownload` | Free PDF / double debit / stuck unpaid |
| Preview PDF | `GET /api/invoices/:id/preview` | Clean PDF without pay |
| Top-up create | `POST /api/wallet/topup` | Arbitrary credit amount |
| Pakasir webhook | `POST /api/webhooks/pakasir` | Fake top-up credit |
| AI generate | `POST /api/ai-invoice/sessions/:id/generate` | Free AI / double charge / no refund |
| AI output download | `GET /api/ai-invoice/outputs/:id/download` | Steal others’ paid output |
| Admin adjust | `POST /api/admin/users/:id/adjust` | Unlimited credit if admin compromised |
| Storage (R2) | keys only via backend stream | Public bucket = free finals |

---

## 2. Verdict (loss prevention)

**Overall: money paths are well defended for MVP.**  
No critical “anyone can free-download final PDF” or “forge webhook → free balance” found **when production env is configured correctly**.

Remaining residual risks are **ops/config**, **edge race recovery**, and **AI refund orphan** — not open bypasses in happy-path code.

---

## 3. Controls that already block loss

### 3.1 Final download (highest value)

| Control | Where | Status |
|---------|--------|--------|
| Auth required | download route `requireUser` | OK |
| Ownership | `invoice.findUnique({ id, userId })` | OK |
| Price server-side only | `FINAL_DOWNLOAD_PRICE` constant | OK (client cannot set price) |
| Conditional claim | `updateMany` unpaid → `processing_payment` | OK (concurrent claim fails) |
| PDF before debit | generate + `pdfStorage.put` then debit | OK (no charge on gen fail) |
| Debit + mark paid atomic | `$transaction` + `debitWallet` + status paid | OK |
| Idempotency key | `download:${invoiceId}:${versionNumber}` unique | OK |
| Atomic balance check | `updateMany` `currentBalance >= amount` | OK (race-safe) |
| Free re-download only if `status === paid` | early return paid branch | OK |
| Edit paid → new unpaid version | `editInvoice` | OK (re-pay on edit) |
| Rate limit | `RATE_LIMITS.DOWNLOAD` | OK |
| No public PDF URL | stream from API + private R2 | OK by design |

**Tests cover:** insufficient balance, gen fail no debit, free re-download, claim race, duplicate idempotency, post-debit fail → `generation_failed`.

### 3.2 GoCar preview stamp

| Control | Status |
|---------|--------|
| Auth + ownership | OK |
| Watermark forced for preview path | OK (`watermark` option) |
| Sample short-circuit clean source PDF | **Only without watermark** — final download path; preview always watermarks |
| Rate limit PREVIEW | OK |

### 3.3 Top-up + webhook

| Control | Status |
|---------|--------|
| Only Rp50k / Rp100k | `ALLOWED_TOPUP_AMOUNTS` | OK |
| Project slug match | OK |
| Local order exists | OK |
| Amount must match local payment | OK |
| Sandbox mode from **server env only** | OK (body `is_sandbox` ignored) |
| Production: Detail API must be `completed` | OK |
| Idempotent credit | `pakasir:${order_id}` + payment status success | OK |
| Event dedup table | `PaymentWebhookEvent` unique | OK |
| Optional HMAC if `PAKASIR_WEBHOOK_SECRET` | OK when set |
| Rate limit webhook by IP | OK |
| Generic error to client | OK (no oracle) |

**Tests cover:** wrong slug/amount/missing payment, detail pending, already processed, sandbox forge blocked, signature path.

### 3.4 Wallet primitives

| Control | Status |
|---------|--------|
| Append-only ledger + unique `idempotencyKey` | OK |
| Credit/debit only via server services | OK |
| Debit rejects `amount <= 0` | OK |
| Concurrent overdraw blocked | OK (`updateMany` gte) |

### 3.5 AI generation

| Control | Status |
|---------|--------|
| Auth + session ownership | OK |
| Idempotency key required | OK |
| Debit inside transaction before provider call | OK |
| Refund on provider fail (`refund_credit` unique key) | OK |
| Output download ownership + status success | OK |

### 3.6 Admin

| Control | Status |
|---------|--------|
| `requireAdmin` role check | OK |
| Idempotency key required | OK |
| Audit log on adjust | OK |

### 3.7 Authz isolation

User-scoped queries on invoice/download/preview/AI. Admin APIs use `requireAdmin`. Middleware refreshes Supabase session.

---

## 4. Findings (ordered by money impact)

### P0 — Production config (not code bugs, but enable full bypass if wrong)

| ID | Finding | Impact | Evidence | Required action |
|----|---------|--------|----------|-----------------|
| **C1** | `PAKASIR_SANDBOX=true` in production | Webhook trusts body `status=completed` without Detail API → **fake top-ups** if webhook endpoint reachable | `isSandboxMode()` in `pakasir.ts` | **Must be unset/false in prod.** Verify Vercel env. |
| **C2** | R2 bucket public / public ACL | Direct object URL = free final PDFs | `pdf-storage.ts` assumes private | Confirm bucket private; no public policy. |
| **C3** | First user can be promoted to `admin` only via DB; no self-role API | Low code risk; ops mistake = free credit via adjust | role set `"user"` on signup | Document: never bulk-set admin; 2FA on admin accounts. |
| **C4** | `PAKASIR_WEBHOOK_SECRET` optional | Without secret, defense relies on Detail API + order existence | `if (webhookSecret)` | **Set secret in prod** if Pakasir supports signing; else rely on Detail API (already required in non-sandbox). |

### P1 — Residual product/finance risks (harder abuse, not open door)

| ID | Finding | Impact | Detail | Mitigation |
|----|---------|--------|--------|------------|
| **R1** | `generation_failed` after debit started | User may be charged without easy self-serve recovery; status not auto-refund | Catch path after `debitTransactionStarted` | Admin tool or cron: refund + reset; document support SOP. **Not free PDF** (status not paid). |
| **R2** | AI generate: debit then provider fail; refund can fail | Orphan debit (`generating`) | Explicit `ponytail` comment in `ai-invoice/service.ts` | Cron: refund `generating` older than N min with ledger and no success image. |
| **R3** | Webhook amount compare is strict equality | Type coercion if JSON amount is string `"50000"` | `payment.amount !== amount` | Coerce: `Number(amount)` after validate finite integer; reject non-integer. |
| **R4** | `creditWallet` does not reject `amount <= 0` | Admin/bug could no-op or weird ledger | Only debit has `amount <= 0` guard | Mirror guard on credit; reject non-finite. |
| **R5** | Rate limit falls back to **in-memory** without Upstash | Multi-instance deploy → N× looser limits | `src/lib/rate-limit.ts` | Set `UPSTASH_REDIS_*` in production. |
| **R6** | Stale `processing_payment` reset after 5 min | Attacker could start claim, kill connection; after timeout retry | Intended recovery | Acceptable; claim still single-winner. Monitor stuck rows. |
| **R7** | Free re-download of **paid** version forever | By design (same version free) | Product rule | Not a bug. Abuse = share account only. |
| **R8** | Sample GoCar content short-circuits to clean reference PDF on **final** path | Only for exact reference sample payload; still requires paid flow if unpaid | `isReferenceSample` | Acceptable; ensure sample not used as free template without pay (still goes through `processDownload`). |

### P2 — Hardening / defense in depth

| ID | Finding | Note |
|----|---------|------|
| **H1** | Webhook has no shared-secret **required** | Prefer require signature in prod when available |
| **H2** | Admin adjust no rate limit | Add rate limit on admin money APIs |
| **H3** | AI generate route no dedicated rate limit | Can burn balance + provider cost; add RATE_LIMITS.AI_GENERATE |
| **H4** | `postcss` moderate via Next (npm audit) | Not financial; track Next upgrade |
| **H5** | Filename in Content-Disposition from title | Low XSS/header injection if exotic titles — sanitize filename |
| **H6** | No CSRF tokens on cookie-session APIs | SameSite cookies + Supabase; low for pure JSON APIs; keep cookies SameSite=Lax/Strict |
| **H7** | Preview returns full stamped PDF bytes (watermarked) | Deterrence only — not anti-screenshot (documented) |

### Not found (checked)

- Client-side wallet mutation endpoints  
- Download price from request body  
- Webhook trust of body-only status in production mode  
- Cross-user invoice download without ownership  
- Public permanent final PDF URL in app code  
- Self-service role elevation API  

---

## 5. Bypass scenarios (attacker model)

| Scenario | Result |
|----------|--------|
| Unauthenticated download | 401 |
| Download other user’s invoiceId | Not found / ownership fail |
| Replay download unpaid concurrent | Second claim fails; one debit max |
| Replay download paid | Free re-download **same version only** (by design) |
| Edit paid then download | New unpaid version → charge again |
| Forge webhook random order_id | Rejected (no local payment) |
| Forge webhook wrong amount | Rejected |
| Forge webhook `is_sandbox` | Ignored; Detail API still used if not server sandbox |
| Set top-up amount 10 | Rejected (not in allowlist) |
| Call credit from client | No such API |
| AI generate without idempotency key | Rejected |
| AI generate twice same key | No second debit |
| Steal AI output id of another user | Ownership filter on download |
| Preview GoCar without pay | Watermarked only |
| Hit storageKey URL if leaked | **Depends on R2 private** (C2) |

---

## 6. Production checklist (do this before calling “safe”)

- [ ] `PAKASIR_SANDBOX` **not** set / not `true` on production  
- [ ] `PAKASIR_API_KEY`, `PAKASIR_PROJECT_SLUG` set; Detail API reachable  
- [ ] Prefer `PAKASIR_WEBHOOK_SECRET` set  
- [ ] R2 bucket **private**; no public read ACL  
- [ ] `UPSTASH_REDIS_REST_URL` + `TOKEN` set (distributed rate limits)  
- [ ] Admin users: minimal set; strong auth  
- [ ] Webhook URL only HTTPS; monitor failed webhook logs  
- [ ] Smoke: top-up sandbox/live → balance; double webhook no double credit; double download unpaid → one charge; paid re-download free  

---

## 7. Recommended code follow-ups (optional, ranked)

1. **R3** Coerce/validate webhook `amount` as positive integer.  
2. **R4** `creditWallet`: reject `amount <= 0` / non-finite.  
3. **R2** Cron or admin job: refund stuck AI `generating` + ledger without output.  
4. **R1** Admin refund path for `generation_failed` downloads (or auto-refund if debit committed but status not paid — only if you can prove debit without paid).  
5. **H3** Rate limit AI generate + admin adjust.  
6. **H5** Sanitize PDF filename header.

---

## 8. Summary for owner

| Question | Answer |
|----------|--------|
| Bisa unduh PDF final gratis tanpa bayar? | **Tidak**, jika auth+ownership+paid gate + private R2 OK |
| Bisa isi saldo palsu via webhook? | **Tidak di production mode** (Detail API + local order + amount). **Ya jika sandbox env salah** |
| Double charge unduh? | **Dicegah** claim + idempotency + atomic debit |
| Double credit top-up? | **Dicegah** payment status + ledger unique key + event dedup |
| AI gratis berulang? | **Tidak** (debit + idempotency); residual orphan debit if refund fails |
| Admin bisa bikin rugi? | **Ya by design** (manual credit) — proteksi = role admin saja |

**Bottom line:** Architecture matches AGENTS.md financial rules. Biggest real “we lose money” risks are **misconfigured production env (sandbox/R2/public)** and **stuck intermediate states needing ops refund**, not an open client bypass.
