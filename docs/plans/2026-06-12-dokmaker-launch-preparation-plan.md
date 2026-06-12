# DokMaker Launch Preparation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the existing DokMaker codebase and documentation until it is honestly reportable as production-launch preparation ready, with evidence-backed verification and explicit remaining blockers.

**Architecture:** Keep the current modular Next.js + Prisma structure, avoid rewrites, and close the highest-risk launch-preparation gaps first: misleading PDF behavior, weak evidence tests, operational docs, and readiness reporting.

**Tech Stack:** Next.js, TypeScript, Prisma, Vitest, PostgreSQL, Supabase Auth, Pakasir.

---

### Task 1: Add failing regression tests for PDF final-output behavior

**Files:**
- Modify: `tests/smoke.test.ts`
- Create or Modify: `tests/pdf-generation.test.ts`
- Modify: `src/lib/pdf/generator.ts`

**Step 1: Write the failing test**

Add tests that assert:
- final PDF generation must reject when no real PDF engine is available
- fallback HTML buffer must not be returned as if it were a PDF
- generated binary must begin with `%PDF` when generation succeeds through injected engine or test seam

Example test shape:

```ts
it("rejects final pdf generation when no pdf engine is available", async () => {
  await expect(generateInvoicePdf(sampleContent, {
    loadPuppeteer: async () => {
      throw new Error("missing");
    },
  })).rejects.toThrow(/PDF engine/i);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/pdf-generation.test.ts
```

Expected: FAIL because current implementation returns HTML buffer fallback.

**Step 3: Write minimal implementation**

Refactor `generateInvoicePdf` to:
- support a small injectable loader seam for tests
- throw a controlled error when no supported PDF engine is available
- never return HTML disguised as PDF

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/pdf-generation.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/pdf-generation.test.ts src/lib/pdf/generator.ts
git commit -m "fix: fail safely when pdf engine unavailable"
```

### Task 2: Add failing tests for Pakasir webhook verification edge cases

**Files:**
- Create or Modify: `tests/pakasir-webhook.test.ts`
- Modify: `src/modules/payments/pakasir.ts`

**Step 1: Write the failing test**

Add tests for:
- webhook body with matching order but detail API non-completed must not credit
- detail API failure must not mark payment success
- already-success payment must not create duplicate ledger entry
- wrong project slug rejected
- wrong amount rejected

Use mocked Prisma/fetch seams only where unavoidable; assert behavior, not mock internals.

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/pakasir-webhook.test.ts
```

Expected: FAIL for at least one behavior gap or untestable structure.

**Step 3: Write minimal implementation**

Refactor `handlePakasirWebhook` as needed to:
- isolate verification flow
- keep crediting transactional
- make negative outcomes explicit and testable
- preserve idempotency guarantees

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/pakasir-webhook.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/pakasir-webhook.test.ts src/modules/payments/pakasir.ts
git commit -m "test: harden pakasir webhook verification"
```

### Task 3: Add failing tests for paid download safety and status handling

**Files:**
- Create or Modify: `tests/download-flow.test.ts`
- Modify: `src/modules/downloads/service.ts`
- Modify: `src/modules/wallet/service.ts`

**Step 1: Write the failing test**

Add tests for:
- unpaid version with insufficient balance rejects before PDF generation
- PDF generation failure does not debit wallet or mark version paid
- paid version re-download remains free
- unsupported version status is rejected safely
- duplicate idempotency key path does not produce extra debit side effects

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/download-flow.test.ts
```

Expected: FAIL where current structure hides or mishandles at least one path.

**Step 3: Write minimal implementation**

Refactor `processDownload` to improve safety/testability without broad rewrites:
- add seams for PDF generator and persistence helpers if needed
- keep debit + paid transition transactional
- make no-charge-on-failure behavior explicit

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/download-flow.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/download-flow.test.ts src/modules/downloads/service.ts src/modules/wallet/service.ts
git commit -m "test: harden paid download flow safety"
```

### Task 4: Clean readiness-impacting warnings and production config gaps

**Files:**
- Modify: `src/app/app/invoices/page.tsx`
- Modify: `src/app/app/templates/page.tsx`
- Modify: `src/lib/logger.ts`
- Modify: `package.json`
- Create: `prisma.config.ts`
- Modify: test files with unused vars warnings

**Step 1: Write the failing test or check**

For config/warning cleanup, use verification-first checks rather than unit tests:
- capture current lint/build/prisma warnings
- define target as no avoidable code warnings and no deprecated Prisma package config usage

**Step 2: Run check to verify current failure/warning state**

Run:
```bash
npm run lint && npm run build && npx prisma validate
```

Expected: warnings present before cleanup.

**Step 3: Write minimal implementation**

- remove unused imports/vars
- replace `<img>` with `next/image` or acceptable alternative
- migrate Prisma config out of `package.json` into `prisma.config.ts`
- keep behavior unchanged

**Step 4: Run check to verify warnings are reduced/removed**

Run:
```bash
npm run lint && npm run build && npx prisma validate
```

Expected: cleaner output than before; document any unavoidable remaining warnings.

**Step 5: Commit**

```bash
git add src package.json prisma.config.ts tests
git commit -m "chore: clean launch preparation warnings"
```

### Task 5: Add production readiness documentation set

**Files:**
- Create: `docs/production/env-checklist.md`
- Create: `docs/production/production-readiness-review.md`
- Create: `docs/production/rollback-plan.md`
- Create: `docs/production/launch-evidence-2026-06-12.md`
- Create: `docs/production/staging-smoke-run-2026-06-12.md`

**Step 1: Write the failing check**

List missing docs and required sections based on:
- `AGENTS.md`
- `docs/plans/2026-06-12-dokmaker-smoke-checklist.md`
- `docs/plans/2026-06-12-dokmaker-master-production-implementation-plan.md`

**Step 2: Run check to verify absence/gaps**

Run:
```bash
find docs/production -maxdepth 2 -type f | sort
```

Expected: required files missing or incomplete.

**Step 3: Write minimal implementation**

Create docs with explicit status sections:
- what is verified
- what is blocked
- what needs credentials/deploy access
- rollback/forward-fix notes
- env variable contract
- smoke evidence template with current results

**Step 4: Run check to verify files exist**

Run:
```bash
find docs/production -maxdepth 2 -type f | sort
```

Expected: all required files present.

**Step 5: Commit**

```bash
git add docs/production
git commit -m "docs: add launch preparation readiness set"
```

### Task 6: Run full verification and update readiness report honestly

**Files:**
- Modify: `docs/production/production-readiness-review.md`
- Modify: `docs/production/launch-evidence-2026-06-12.md`
- Modify: `docs/production/staging-smoke-run-2026-06-12.md`

**Step 1: Run the full verification suite**

Run:
```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

**Step 2: Record actual results**

Update docs with:
- pass/fail per command
- unresolved blockers
- skipped deployment/live payment checks with rationale
- residual risks

**Step 3: Re-run if any doc-driven fix changes code**

Run the affected commands again.

**Step 4: Final verification**

Run:
```bash
git status
```

Expected: only intended changes present.

**Step 5: Commit**

```bash
git add docs/production
git commit -m "docs: record launch preparation verification evidence"
```
