# Preview–Download Render Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every newly generated PDF visually identical to its preview except for preview-only watermark/meta.

**Architecture:** Reuse the existing trusted template renderer, but move construction of the complete HTML document into one client-safe helper consumed by both preview and PDF generation. Render preview inside a sandboxed iframe so application CSS cannot alter the A4 document; watermark/meta remain overlay-only, while paid artifacts already stored under `storageKey` remain untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Puppeteer Core, `@sparticuz/chromium`, native iframe `srcDoc`.

---

## Constraints

- Do not modify wallet, Pakasir, webhook, debit, authorization, or PDF storage behavior.
- Do not regenerate or replace existing paid PDF artifacts.
- Do not add a dependency or a preview-PDF endpoint.
- Work around existing uncommitted changes; do not edit `src/modules/downloads/service.ts` or `tests/download-flow.test.ts` for this task.
- Expected application files touched: three; tests and these approved docs are additional verification artifacts.

### Task 1: Prove the single-document parity contract

**Files:**
- Create: `src/modules/templates/render-document.ts`
- Modify: `tests/template-rendering.test.ts:1-64`

**Step 1: Write the failing tests**

Extend `tests/template-rendering.test.ts` to import a not-yet-created `renderDocumentHtml` helper and add one parity test. Use a template where watermark/meta sit between normal elements:

```ts
import { renderDocumentHtml } from "@/modules/templates/render-document";

it("changes only preview watermark/meta between preview and final documents", () => {
  const htmlTemplate = [
    '<main data-page="invoice">',
    "<h1>{{invoice.number}}</h1>",
    "{{preview.watermark}}",
    "<p>{{client.name}}</p>",
    "{{preview.meta}}",
    "</main>",
  ].join("");
  const preview = renderDocumentHtml({
    htmlTemplate,
    documentType: "invoice",
    content,
    mode: "preview",
    previewMeta: {
      email: "user@example.test",
      timestamp: "20 Jun 2026",
      versionId: "ver_1",
    },
  });
  const final = renderDocumentHtml({
    htmlTemplate,
    documentType: "invoice",
    content,
    mode: "final",
  });

  const withoutPreviewOnlyNodes = preview
    .replace(/<div class="dokmaker-preview-watermark"[\s\S]*?<\/div>/, "")
    .replace(/<div class="dokmaker-preview-meta"[\s\S]*?<\/div>/, "");

  expect(withoutPreviewOnlyNodes).toBe(final);
  expect(preview).toContain("<!DOCTYPE html>");
  expect(preview).toContain("@page { size: A4; margin: 0; }");
  expect(preview).toContain("position: fixed");
});
```

Keep the existing escaping, item, and preview-placeholder tests unchanged.

**Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- tests/template-rendering.test.ts
```

Expected: FAIL because `@/modules/templates/render-document` does not exist.

**Step 3: Implement the minimum complete-document helper**

Create `src/modules/templates/render-document.ts`. It must:

1. Import and call `renderDocumentTemplateHtml()`.
2. Accept the existing `RenderDocumentTemplateHtmlInput` shape; export that input type from `render-template.ts` if needed.
3. Return one complete document containing:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    .dokmaker-preview-watermark,
    .dokmaker-preview-meta { position: fixed; z-index: 2147483647; pointer-events: none; }
  </style>
</head>
<body>...rendered template...</body>
</html>
```

Do not add template-specific layout CSS. Existing platform templates remain responsible for their own visual design.

**Step 4: Run the focused test**

```bash
npm test -- tests/template-rendering.test.ts
```

Expected: PASS, including escaping and parity assertions.

**Step 5: Commit**

Only if the owner asks for commits and the worktree contains no unrelated staged files:

```bash
git add src/modules/templates/render-document.ts src/modules/templates/render-template.ts tests/template-rendering.test.ts
git commit -m "fix(rendering): share preview and PDF document HTML"
```

### Task 2: Route final PDF HTML through the shared document

**Files:**
- Modify: `src/lib/pdf/generator.ts:1-160`
- Modify: `tests/pdf-generation.test.ts:35-146`

**Step 1: Write the failing generator contract test**

In `tests/pdf-generation.test.ts`, import `renderDocumentHtml`, then assert the custom-template output equals that helper's final-mode output exactly:

```ts
it("uses the shared final document without PDF-only markup", () => {
  const template = {
    htmlTemplate: '<main class="shared">{{invoice.number}}</main>',
    documentType: "invoice" as const,
  };

  expect(generateInvoiceHtml(sampleContent, template)).toBe(
    renderDocumentHtml({
      ...template,
      content: sampleContent,
      mode: "final",
    })
  );
});
```

This must compare the complete string, not selected markers.

**Step 2: Run the test to verify it fails**

```bash
npm test -- tests/pdf-generation.test.ts
```

Expected: FAIL because `generateInvoiceHtml()` still builds its own wrapper.

**Step 3: Replace only the custom-template wrapper**

In `src/lib/pdf/generator.ts`:

- Replace the direct `renderDocumentTemplateHtml` import with `renderDocumentHtml`.
- In the `template?.htmlTemplate` branch, return `renderDocumentHtml({ htmlTemplate, documentType, content, mode: "final" })`.
- Keep the existing no-template invoice fallback unchanged for backward compatibility.
- Keep Puppeteer options A4, zero margin, print background, and `preferCSSPageSize: true` unchanged.

Do not alter Chromium loading, storage access, or error behavior.

**Step 4: Run focused render/PDF tests**

```bash
npm test -- tests/template-rendering.test.ts tests/pdf-generation.test.ts tests/gocar-receipt-rendering.test.ts
```

Expected: PASS.

**Step 5: Commit**

Only when requested:

```bash
git add src/lib/pdf/generator.ts tests/pdf-generation.test.ts
git commit -m "fix(pdf): use shared template document renderer"
```

### Task 3: Isolate preview in the same HTML document

**Files:**
- Modify: `src/components/invoices/template-preview.tsx:1-33`
- Modify: `src/app/app/invoices/[invoiceId]/preview/preview-client.tsx:124-145`
- Create: `tests/template-preview-source.test.ts`

**Step 1: Write the failing source-level regression test**

The repository has no component DOM test dependency; do not add one. Create `tests/template-preview-source.test.ts` using Node `readFileSync` to protect the required native implementation:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/components/invoices/template-preview.tsx",
  "utf8"
);

describe("TemplatePreview", () => {
  it("isolates the shared document in a sandboxed iframe", () => {
    expect(source).toContain("renderDocumentHtml");
    expect(source).toContain("<iframe");
    expect(source).toContain("srcDoc={html}");
    expect(source).toContain('sandbox=""');
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
```

**Step 2: Run the test to verify it fails**

```bash
npm test -- tests/template-preview-source.test.ts
```

Expected: FAIL because preview still uses a `<div dangerouslySetInnerHTML>`.

**Step 3: Render the shared document in an iframe**

Modify `src/components/invoices/template-preview.tsx`:

- Import `renderDocumentHtml` instead of `renderDocumentTemplateHtml`.
- Build preview HTML with the same `htmlTemplate`, normalized `documentType`, `content`, and `previewMeta`.
- Return a native iframe:

```tsx
<iframe
  title="Preview dokumen"
  srcDoc={html}
  sandbox=""
  className="block h-[1123px] w-[794px] border-0 bg-white"
/>
```

The empty sandbox is intentional: current templates are static HTML/CSS and need no scripts, forms, navigation, or same-origin access.

In `preview-client.tsx`, preserve the existing horizontal-scroll container and 794px document width. Remove only wrappers/classes made redundant by the iframe if necessary; do not redesign the workspace.

**Step 4: Run focused tests and static checks**

```bash
npm test -- tests/template-preview-source.test.ts tests/template-rendering.test.ts tests/pdf-generation.test.ts tests/gocar-receipt-rendering.test.ts
npm run typecheck
npm run lint -- src/components/invoices/template-preview.tsx 'src/app/app/invoices/[invoiceId]/preview/preview-client.tsx' src/modules/templates/render-document.ts src/lib/pdf/generator.ts
```

Expected: all commands exit 0.

**Step 5: Commit**

Only when requested:

```bash
git add src/components/invoices/template-preview.tsx 'src/app/app/invoices/[invoiceId]/preview/preview-client.tsx' tests/template-preview-source.test.ts
git commit -m "fix(preview): isolate shared A4 document rendering"
```

### Task 4: Verify new-document parity end to end

**Files:**
- Modify only if evidence is requested: `docs/plans/2026-07-10-preview-download-render-parity-evidence.md`

**Step 1: Run the full automated suite**

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
```

Expected: every command exits 0. If an unrelated existing uncommitted change causes a failure, record the exact command/error and do not alter payment/download code as part of this task.

**Step 2: Review the exact diff**

```bash
git diff -- src/modules/templates/render-document.ts src/modules/templates/render-template.ts src/lib/pdf/generator.ts src/components/invoices/template-preview.tsx 'src/app/app/invoices/[invoiceId]/preview/preview-client.tsx' tests/template-rendering.test.ts tests/pdf-generation.test.ts tests/template-preview-source.test.ts
git status --short
```

Expected: no wallet, payment, webhook, download-service, storage, environment, or migration file was changed by this implementation.

**Step 3: Perform manual browser smoke without restarting an existing service**

Use the already-running verified DokMaker instance if its cwd is proven; otherwise ask before starting/restarting the app. For one new invoice and one new GoCar receipt:

1. Open preview at desktop width and 360px mobile width.
2. Confirm the full A4 canvas is preserved and mobile uses horizontal scrolling without document reflow.
3. Confirm watermark/meta overlay appears and does not shift content.
4. Download a newly generated PDF.
5. Compare text, font, coordinates, spacing, and page breaks against preview.
6. Confirm final PDF contains no preview watermark/meta.
7. Confirm an existing paid re-download still returns its stored artifact and was not regenerated.

**Step 4: Record evidence if requested**

Create `docs/plans/2026-07-10-preview-download-render-parity-evidence.md` with actual command outputs and screenshots/paths. Do not claim pixel parity solely from unit tests; manual or automated visual comparison is required.

## Acceptance Criteria

- Preview and newly generated PDF consume the exact same complete HTML document builder.
- Removing `.dokmaker-preview-watermark` and `.dokmaker-preview-meta` from preview output produces byte-identical final HTML.
- Watermark/meta are fixed overlays and do not affect normal layout or pagination.
- Preview runs in a sandboxed iframe and cannot inherit application CSS.
- New invoice and GoCar PDF layout match preview in manual smoke.
- Existing paid artifacts are neither replaced nor regenerated.
- No new dependency, API route, wallet change, payment change, or storage change is introduced.
