# DokMaker Launch Verification Evidence — 2026-06-12

**Status:** Automated verification recorded; live/manual checks pending
**Commit SHA:** `370acc2` (branch `main`)
**Database migration status:** up to date (1 migration)
**Pakasir mode:** not exercised in this pass (no sandbox run)

This file records actual command results from the launch-preparation verification pass. Values reflect runs against `main` with local env from `.env`.

---

## 1. Verification commands and results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run lint` | PASS | 0 errors, 0 warnings after unused-import cleanup. |
| `npm run typecheck` | PASS | `tsc --noEmit` clean. |
| `npm test` | PASS | 10 test files, 82 tests passing. |
| `npm run build` | PASS | Exit 0, `.next/BUILD_ID` produced, 35 app routes compiled. |
| `npx prisma validate` | PASS | Schema valid. |
| `npx prisma migrate status` | PASS | "Database schema is up to date!", 1 migration. |

### Notes on build output
The Turbopack build prints interactive carriage-return progress that does not always flush cleanly to a captured log in this environment. Build success was confirmed via deterministic signals: exit code 0, presence of `.next/BUILD_ID`, and 35 compiled routes under `.next/server/app`.

## 2. Test coverage added in this pass

- `tests/pdf-generation.test.ts` — PDF engine fail-safe behavior.
- `tests/pakasir-webhook.test.ts` — webhook verification + idempotency (8 cases).
- `tests/download-flow.test.ts` — paid download safety (6 cases).

## 3. Commits in this pass

- `23d7ca2` fix: fail safely when pdf engine unavailable
- `b22fd9b` test: fix pdf generation fixture typing
- `2a90c3a` test: add pakasir webhook verification coverage
- `9a71b1c` test: extend pakasir webhook edge coverage
- `5b3fbde` test: add paid download safety coverage
- `c6eb365` chore: reduce readiness warnings and config gaps
- `97fd0ee` fix: address task 4 review findings
- `544173b` merge: launch-prep hardening into main
- `370acc2` chore: remove unused imports flagged by lint

## 4. Smoke tests passed

- Automated `§3` verification commands of the smoke checklist: PASS (see table above).

## 5. Smoke tests failed

- None recorded. (No live/manual smoke executed — see skipped section.)

## 6. Skipped checks and rationale

- **AUTH-001..003, TPL, INV, PREV, PAY, DL, ADM, SEC manual flows**: require a running deployment with seed data and a Pakasir sandbox. Not available in this pass.
- **PAY-002 Pakasir payment simulation / PAY-003..005 webhook runtime**: require sandbox credentials and a reachable webhook URL.

## 7. Known residual risks

1. Pakasir API key transmitted in URL query string (`src/modules/payments/pakasir.ts`).
2. PDF generated before debit transaction in `processDownload` (safe direction; mitigated by free paid re-download).
3. Preview is deterrence-only, not screenshot-proof (by design).

## 8. Reviewer

- AI engineering agent, launch-preparation hardening pass.
- Date/time: 2026-06-12.
