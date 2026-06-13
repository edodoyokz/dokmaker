# DokMaker Production Readiness Review

**Status:** Launch-preparation — NOT yet declared production-ready/live-ready
**Last updated:** 2026-06-12
**Reviewer:** AI engineering agent (launch-prep hardening pass)

This review reports the honest state of DokMaker for a launch decision. It separates what is verified from what is blocked or needs live credentials/deploy access. Per `AGENTS.md` §10, the app is not declared production-ready until every listed condition is met with evidence.

---

## 1. Summary

The codebase passed automated verification (lint, typecheck, unit tests, build, prisma validate, migrate status) on `main` after the launch-prep hardening pass. Critical financial and delivery invariants now have targeted regression tests. However, end-to-end live payment verification, duplicate-webhook/duplicate-download runtime tests against a real Pakasir sandbox, and a manual smoke run remain outstanding. Therefore the honest status is **launch-preparation complete, production-launch pending evidence**.

## 2. What is verified (evidence-backed)

- **Automated suite passes** on `main` — see `launch-evidence-2026-06-12.md`.
- **PDF final output fails safe**: `generateInvoicePdf` throws when no PDF engine is available and never returns HTML disguised as a PDF. Covered by `tests/pdf-generation.test.ts`.
- **Pakasir webhook verification**: rejects wrong project slug, wrong amount, missing payment, missing API key, non-completed detail status, and failed detail request; credits exactly once on completed; already-success returns `already_processed`. Covered by `tests/pakasir-webhook.test.ts`.
- **Paid download safety**: insufficient balance rejected before PDF generation; PDF failure does not debit or mark paid; paid re-download is free; unsupported status rejected; debit + paid transition transactional with idempotency key. Covered by `tests/download-flow.test.ts`.
- **Idempotency primitives**: unique `idempotencyKey` on ledger entries plus transactional balance+ledger writes (`src/modules/wallet/service.ts`).
- **Schema/migrations**: `prisma validate` clean, `prisma migrate status` reports database up to date (1 migration).

## 3. What is NOT yet verified (blocked / needs access)

- **Live/sandbox Pakasir payment end-to-end** (PAY-001..PAY-005 in smoke checklist): requires a configured Pakasir sandbox project and reachable webhook URL. Not executed in this pass.
- **Runtime duplicate-webhook and duplicate-download tests**: invariants are unit-tested, but a real concurrent/replay run against a deployed instance has not been performed.
- **Manual smoke run** of auth, preview authorization, secure file delivery, and admin operations (AUTH/PREV/SEC/ADM/DL sections): requires a running deployment with seed data.
- **Production deploy target confirmation**: deploy platform/secrets not exercised in this pass.

## 4. Residual risks

1. **Pakasir API key in URL query string** (`src/modules/payments/pakasir.ts`) — may leak into logs. Track before live launch (see `env-checklist.md`).
2. **PDF generated before debit transaction** in `processDownload` — safe direction (failure means no charge), but a successful debit followed by client disconnect could charge without the user receiving the file in that request. Re-download is free for paid versions, which mitigates impact.
3. **Preview is deterrence-only** — watermark + auth, not screenshot-proof, by design.

## 5. Production-readiness conditions (AGENTS.md §10)

| Condition | Status |
|-----------|--------|
| Critical user journey passes end-to-end | PENDING (manual/live smoke not run) |
| Pakasir sandbox/live payment verification passes | PENDING (no sandbox run) |
| Duplicate webhook + duplicate download tests pass | PARTIAL (unit-tested, runtime pending) |
| Authz/data isolation tests pass | PARTIAL (unit-level; manual SEC run pending) |
| build/lint/typecheck/tests pass | DONE (see evidence) |
| Env/secrets configured safely | PARTIAL (contract documented; live store pending) |
| Rollback/forward-fix plan documented | DONE (`rollback-plan.md`) |
| Launch checklist completed with evidence | PENDING |

## 6. Recommendation

Proceed to a staging deployment with Pakasir sandbox, then execute `docs/plans/2026-06-12-dokmaker-smoke-checklist.md` end-to-end and record results in `staging-smoke-run-2026-06-12.md`. Only after those pass should the app be declared production-ready.
