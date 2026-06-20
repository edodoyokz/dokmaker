# Template-Based Invoice Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make invoice preview and final PDF generation faithfully use the selected `InvoiceTemplate.htmlTemplate`, while keeping paid versions immutable, financially safe, and launch-verifiable.

**Architecture:** Introduce a small server-side render module that converts trusted platform/admin template HTML plus validated invoice content into final HTML using a constrained placeholder contract and HTML escaping for user content. Update preview and download flows to fetch the selected template, render the same template contract for web preview/PDF, add content hashes, and persist paid PDF artifacts through a storage abstraction before marking invoice versions paid. Keep wallet debit and paid marking atomic after successful PDF generation/storage.

**Tech Stack:** Next.js 16, TypeScript, React 19, Prisma/PostgreSQL, Vitest, Zod, Puppeteer-compatible PDF engine, future S3/R2-compatible storage abstraction.

---

## Launch Readiness Acceptance Criteria

1. Creating an invoice from template A and template B produces visibly different preview HTML/PDF when their `htmlTemplate` values differ.
2. `generateInvoiceHtml` no longer hardcodes one universal invoice layout as the only render path.
3. User-supplied invoice content is HTML-escaped before insertion into admin/platform templates.
4. Paid final PDF is persisted and `InvoiceVersion.storageKey` is set before status becomes `paid`.
5. Re-download of a paid version reads the persisted PDF artifact instead of regenerating from mutable runtime code.
6. Duplicate/parallel download requests do not debit wallet twice.
7. Existing wallet/payment invariants remain intact.
8. Verification commands pass: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx prisma validate`.

---

## Important Current-State Notes

- `prisma/schema.prisma` already has `InvoiceTemplate.htmlTemplate`, `InvoiceVersion.contentHash`, and `InvoiceVersion.storageKey`.
- Current render path ignores `htmlTemplate` completely:
  - `src/lib/pdf/generator.ts`
  - `src/components/invoices/invoice-preview.tsx`
  - `src/modules/downloads/service.ts`
- `package.json` does not include `puppeteer`, `playwright`, `puppeteer-core`, or Chromium support.
- Seed templates are placeholders and must become real template HTML for smoke testing.
- Do not expose payment/storage secrets in client code or logs.

---

## Template Placeholder Contract v1

Use a constrained, explicit contract. Do not add arbitrary JS evaluation.

Supported scalar placeholders:

```text
{{invoice.number}}
{{invoice.issueDate}}
{{invoice.dueDate}}
{{invoice.currency}}
{{sender.name}}
{{sender.address}}
{{sender.email}}
{{sender.phone}}
{{client.name}}
{{client.address}}
{{client.email}}
{{client.phone}}
{{notes}}
{{paymentInstruction}}
{{total}}
{{preview.watermark}}
{{preview.meta}}
```

Supported item block:

```html
{{#items}}
<tr>
  <td>{{description}}</td>
  <td>{{quantity}}</td>
  <td>{{unitPrice}}</td>
  <td>{{subtotal}}</td>
</tr>
{{/items}}
```

Rules:
- Escape all user content by default.
- Format money as Indonesian Rupiah string without trusting client-provided summary.
- Preview-only placeholders render watermark/meta only in preview mode.
- Unknown placeholders should render empty string initially, and be logged/tested later if needed.

---

### Task 1: Add tests proving templates affect final HTML

**Files:**
- Modify: `tests/pdf-generation.test.ts`
- Modify later: `src/lib/pdf/generator.ts`

**Step 1: Write failing tests**

Add tests below the existing `generateInvoiceHtml` test:

```ts
it("renders using the provided invoice template html", () => {
  const html = generateInvoiceHtml(sampleContent, {
    htmlTemplate: `<section class="custom-template">Invoice {{invoice.number}} for {{client.name}}</section>`,
  });

  expect(html).toContain('class="custom-template"');
  expect(html).toContain("Invoice INV-001 for Client Example");
});

it("produces different html for different templates with the same content", () => {
  const modern = generateInvoiceHtml(sampleContent, {
    htmlTemplate: `<section data-template="modern">{{invoice.number}}</section>`,
  });
  const receipt = generateInvoiceHtml(sampleContent, {
    htmlTemplate: `<section data-template="receipt">{{invoice.number}}</section>`,
  });

  expect(modern).toContain('data-template="modern"');
  expect(receipt).toContain('data-template="receipt"');
  expect(modern).not.toBe(receipt);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/pdf-generation.test.ts
```

Expected: TypeScript/test failure because `generateInvoiceHtml` currently accepts only `content` and ignores template HTML.

**Step 3: Commit only tests?**

Do not commit yet if repository policy prefers red/green in one commit. If committing red tests is not desired, keep changes unstaged until Task 2 passes.

---

### Task 2: Implement constrained template renderer

**Files:**
- Create: `src/modules/templates/render-template.ts`
- Modify: `src/lib/pdf/generator.ts`
- Test: `tests/pdf-generation.test.ts`

**Step 1: Add renderer unit tests**

Create `tests/template-rendering.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { renderInvoiceTemplateHtml } from "@/modules/templates/render-template";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

const content: InvoiceContent = {
  sender: { name: "Alice <script>" },
  client: { name: "Bob & Co" },
  meta: { invoiceNumber: "INV-002", issueDate: "2026-06-20", currency: "IDR" },
  items: [
    { description: "Design <Logo>", quantity: 2, unitPrice: 50000 },
    { description: "Hosting", quantity: 1, unitPrice: 100000 },
  ],
  notes: "Pay soon",
};

describe("renderInvoiceTemplateHtml", () => {
  it("escapes scalar user content", () => {
    const html = renderInvoiceTemplateHtml({
      htmlTemplate: "{{sender.name}} - {{client.name}}",
      content,
      mode: "final",
    });

    expect(html).toContain("Alice &lt;script&gt;");
    expect(html).toContain("Bob &amp; Co");
    expect(html).not.toContain("<script>");
  });

  it("renders item blocks and computed subtotals", () => {
    const html = renderInvoiceTemplateHtml({
      htmlTemplate: "{{#items}}<p>{{description}} {{quantity}} {{unitPrice}} {{subtotal}}</p>{{/items}} Total {{total}}",
      content,
      mode: "final",
    });

    expect(html).toContain("Design &lt;Logo&gt;");
    expect(html).toContain("Rp50.000");
    expect(html).toContain("Rp100.000");
    expect(html).toContain("Total Rp200.000");
  });

  it("adds preview placeholders only in preview mode", () => {
    const previewHtml = renderInvoiceTemplateHtml({
      htmlTemplate: "{{preview.watermark}} {{preview.meta}}",
      content,
      mode: "preview",
      previewMeta: { email: "user@example.test", timestamp: "20 Jun 2026", versionId: "ver_1" },
    });
    const finalHtml = renderInvoiceTemplateHtml({
      htmlTemplate: "{{preview.watermark}} {{preview.meta}}",
      content,
      mode: "final",
    });

    expect(previewHtml).toContain("PREVIEW");
    expect(previewHtml).toContain("user@example.test");
    expect(finalHtml.trim()).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/template-rendering.test.ts
```

Expected: FAIL because `src/modules/templates/render-template.ts` does not exist.

**Step 3: Implement renderer**

Create `src/modules/templates/render-template.ts`:

```ts
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import { calculateInvoiceTotal } from "@/modules/invoices/invoice-content.schema";

type RenderMode = "preview" | "final";

type PreviewMeta = {
  email: string;
  timestamp: string;
  versionId: string;
};

export type RenderInvoiceTemplateHtmlInput = {
  htmlTemplate: string;
  content: InvoiceContent;
  mode: RenderMode;
  previewMeta?: PreviewMeta;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function renderPreviewWatermark(mode: RenderMode): string {
  if (mode !== "preview") return "";
  return '<div class="dokmaker-preview-watermark">PREVIEW</div>';
}

function renderPreviewMeta(mode: RenderMode, previewMeta?: PreviewMeta): string {
  if (mode !== "preview" || !previewMeta) return "";
  return [
    '<div class="dokmaker-preview-meta">',
    `<p>Preview only • ${escapeHtml(previewMeta.email)}</p>`,
    `<p>Generated: ${escapeHtml(previewMeta.timestamp)}</p>`,
    `<p>Version: ${escapeHtml(previewMeta.versionId)}</p>`,
    "</div>",
  ].join("");
}

export function renderInvoiceTemplateHtml({
  htmlTemplate,
  content,
  mode,
  previewMeta,
}: RenderInvoiceTemplateHtmlInput): string {
  const total = calculateInvoiceTotal(content);

  const scalarValues: Record<string, string> = {
    "invoice.number": escapeHtml(content.meta.invoiceNumber),
    "invoice.issueDate": escapeHtml(content.meta.issueDate),
    "invoice.dueDate": escapeHtml(content.meta.dueDate),
    "invoice.currency": escapeHtml(content.meta.currency),
    "sender.name": escapeHtml(content.sender.name),
    "sender.address": escapeHtml(content.sender.address),
    "sender.email": escapeHtml(content.sender.email),
    "sender.phone": escapeHtml(content.sender.phone),
    "client.name": escapeHtml(content.client.name),
    "client.address": escapeHtml(content.client.address),
    "client.email": escapeHtml(content.client.email),
    "client.phone": escapeHtml(content.client.phone),
    notes: escapeHtml(content.notes),
    paymentInstruction: escapeHtml(content.paymentInstruction),
    total: formatRupiah(total),
    "preview.watermark": renderPreviewWatermark(mode),
    "preview.meta": renderPreviewMeta(mode, previewMeta),
  };

  let html = htmlTemplate.replace(/{{#items}}([\s\S]*?){{\/items}}/g, (_match, itemTemplate: string) => {
    return content.items
      .map((item) => {
        const itemValues: Record<string, string> = {
          description: escapeHtml(item.description),
          quantity: escapeHtml(item.quantity),
          unitPrice: formatRupiah(item.unitPrice),
          subtotal: formatRupiah(item.quantity * item.unitPrice),
        };

        return itemTemplate.replace(/{{\s*([\w.]+)\s*}}/g, (_itemMatch, key: string) => itemValues[key] ?? "");
      })
      .join("");
  });

  html = html.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => scalarValues[key] ?? "");

  return html;
}
```

**Step 4: Update PDF generator signatures**

Modify `src/lib/pdf/generator.ts`:
- Import `renderInvoiceTemplateHtml`.
- Add type:

```ts
type InvoiceRenderTemplate = {
  htmlTemplate: string;
};
```

- Change:

```ts
export function generateInvoiceHtml(content: InvoiceContent): string {
```

to:

```ts
export function generateInvoiceHtml(
  content: InvoiceContent,
  template?: InvoiceRenderTemplate
): string {
```

- If `template?.htmlTemplate` exists, return a full HTML document wrapping `renderInvoiceTemplateHtml({ htmlTemplate: template.htmlTemplate, content, mode: "final" })` plus basic print CSS.
- Keep the old hardcoded renderer as fallback temporarily for backward compatibility, but add a TODO to remove fallback after seed/admin templates are migrated.
- Change `generateInvoicePdf(content, options)` to accept `template?: InvoiceRenderTemplate` before `options`, or use an options object that contains `template` to avoid call-site confusion.

Recommended signature:

```ts
export async function generateInvoicePdf(
  content: InvoiceContent,
  options: GenerateInvoicePdfOptions = {}
): Promise<Buffer>
```

Extend options:

```ts
interface GenerateInvoicePdfOptions {
  template?: InvoiceRenderTemplate;
  loadPuppeteer?: () => Promise<PuppeteerModuleLike>;
}
```

Then call:

```ts
const html = generateInvoiceHtml(content, options.template);
```

**Step 5: Run focused tests**

```bash
npm test -- tests/template-rendering.test.ts tests/pdf-generation.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/modules/templates/render-template.ts src/lib/pdf/generator.ts tests/template-rendering.test.ts tests/pdf-generation.test.ts
git commit -m "feat: render invoices from template html"
```

---

### Task 3: Add content hash for invoice versions

**Files:**
- Modify: `src/modules/invoices/service.ts`
- Create: `src/modules/invoices/content-hash.ts`
- Test: `tests/invoice-versioning.test.ts`

**Step 1: Write failing tests**

Add tests for:
- `createInvoice` stores a non-empty `contentHash`.
- Editing unpaid invoice updates `contentHash` when content changes.
- Editing paid invoice creates new unpaid version with its own `contentHash`.

Use existing patterns in `tests/invoice-versioning.test.ts`.

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/invoice-versioning.test.ts
```

Expected: FAIL because `contentHash` is currently never set.

**Step 3: Implement hash helper**

Create `src/modules/invoices/content-hash.ts`:

```ts
import { createHash } from "node:crypto";
import type { InvoiceContent } from "./invoice-content.schema";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashInvoiceContent(content: InvoiceContent): string {
  return createHash("sha256").update(stableStringify(content)).digest("hex");
}
```

**Step 4: Use hash in service**

Modify `src/modules/invoices/service.ts`:
- Import `hashInvoiceContent`.
- In `createInvoice`, set `contentHash: hashInvoiceContent(validated)`.
- In unpaid edit update, set `contentHash` too.
- In paid edit new version create, set `contentHash` too.

**Step 5: Run tests**

```bash
npm test -- tests/invoice-versioning.test.ts tests/invoice-schema.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/modules/invoices/content-hash.ts src/modules/invoices/service.ts tests/invoice-versioning.test.ts
git commit -m "feat: store invoice version content hashes"
```

---

### Task 4: Wire template HTML into final PDF download

**Files:**
- Modify: `src/modules/downloads/service.ts`
- Test: `tests/download-flow.test.ts`

**Step 1: Write failing test**

Add/modify tests in `tests/download-flow.test.ts` to assert:
- `processDownload` passes `invoice.template.htmlTemplate` into PDF generation.
- Different templates produce different generated PDF input HTML, if testing through generator.

If current tests mock `generateInvoicePdf`, assert it is called with:

```ts
expect(generateInvoicePdf).toHaveBeenCalledWith(content, expect.objectContaining({
  template: expect.objectContaining({ htmlTemplate: expect.stringContaining("custom") }),
}));
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/download-flow.test.ts
```

Expected: FAIL because `processDownload` currently fetches invoice without `template` and calls `generateInvoicePdf(content)` only.

**Step 3: Implement wiring**

Modify `src/modules/downloads/service.ts`:
- Fetch invoice with `include: { template: true }`.
- Remove the no-op versions include.
- Call:

```ts
const pdf = await generateInvoicePdf(content, {
  template: { htmlTemplate: invoice.template.htmlTemplate },
});
```

for both paid and unpaid paths temporarily. Task 6 will change paid re-download to storage.

**Step 4: Run focused tests**

```bash
npm test -- tests/download-flow.test.ts tests/pdf-generation.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/downloads/service.ts tests/download-flow.test.ts
git commit -m "feat: use invoice template for final pdf generation"
```

---

### Task 5: Render preview from selected template

**Files:**
- Create: `src/components/invoices/template-preview.tsx`
- Modify: `src/app/app/invoices/[invoiceId]/preview/page.tsx`
- Modify: `src/app/app/invoices/[invoiceId]/preview/preview-client.tsx`
- Existing: `src/components/invoices/invoice-preview.tsx` can remain fallback or be replaced.
- Test: add if component tests are available; otherwise include manual smoke checklist updates in Task 10.

**Step 1: Inspect current PreviewClient props**

Open:

```bash
# use read tool in implementation session
src/app/app/invoices/[invoiceId]/preview/preview-client.tsx
```

**Step 2: Create failing test if feasible**

If React component testing is configured, create a test that renders `TemplatePreview` with custom template HTML and expects custom marker. If not configured, skip automated component test for now and cover server renderer through Task 2 plus manual smoke in Task 10.

**Step 3: Implement template preview component**

Create `src/components/invoices/template-preview.tsx`:

```tsx
import { renderInvoiceTemplateHtml } from "@/modules/templates/render-template";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

type Props = {
  htmlTemplate: string;
  content: InvoiceContent;
  previewMeta: {
    email: string;
    timestamp: string;
    versionId: string;
  };
};

export default function TemplatePreview({ htmlTemplate, content, previewMeta }: Props) {
  const html = renderInvoiceTemplateHtml({
    htmlTemplate,
    content,
    mode: "preview",
    previewMeta,
  });

  return (
    <div
      className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white text-zinc-950 shadow-lg"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

Safety note: `htmlTemplate` is platform/admin-managed, and user content is escaped by the renderer. Keep admin access protected.

**Step 4: Pass template HTML into preview client**

Modify `preview/page.tsx` to pass:

```tsx
htmlTemplate={invoice.template.htmlTemplate}
```

Modify `preview-client.tsx` props to accept `htmlTemplate` and render `TemplatePreview` instead of `InvoicePreview`.

**Step 5: Run checks**

```bash
npm run typecheck
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/components/invoices/template-preview.tsx src/app/app/invoices/[invoiceId]/preview/page.tsx src/app/app/invoices/[invoiceId]/preview/preview-client.tsx
git commit -m "feat: render invoice preview from selected template"
```

---

### Task 6: Add storage abstraction for paid PDF artifacts

**Files:**
- Create: `src/modules/downloads/pdf-storage.ts`
- Modify: `src/modules/downloads/service.ts`
- Test: `tests/download-flow.test.ts`

**Step 1: Write failing tests**

Add tests for:
- First paid download stores generated PDF and sets `storageKey`.
- Paid re-download reads the stored PDF and does not call `generateInvoicePdf` again.

Recommended assertions:

```ts
expect(storedVersion.storageKey).toMatch(/^invoice-finals\//);
expect(generateInvoicePdf).toHaveBeenCalledTimes(1);
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/download-flow.test.ts
```

Expected: FAIL because no storage abstraction exists and paid re-download regenerates.

**Step 3: Implement local/in-memory-compatible abstraction**

Create `src/modules/downloads/pdf-storage.ts`:

```ts
export interface PdfStorage {
  put(key: string, pdf: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

const memoryStorage = new Map<string, Buffer>();

export const pdfStorage: PdfStorage = {
  async put(key, pdf) {
    // MVP local fallback. Replace with R2/S3 implementation before production if deploying beyond preview.
    memoryStorage.set(key, Buffer.from(pdf));
  },
  async get(key) {
    const pdf = memoryStorage.get(key);
    if (!pdf) throw new Error("Final PDF artifact tidak ditemukan");
    return Buffer.from(pdf);
  },
};

export function buildInvoiceFinalPdfStorageKey(input: {
  userId: string;
  invoiceId: string;
  versionId: string;
  contentHash?: string | null;
}): string {
  const hash = input.contentHash ?? "nohash";
  return `invoice-finals/${input.userId}/${input.invoiceId}/${input.versionId}-${hash}.pdf`;
}
```

Important: This local fallback is **not production storage**. Task 8 replaces it with R2/S3 config or explicitly blocks production if credentials are absent.

**Step 4: Update download service**

In paid path:
- If `activeVersion.storageKey` exists: `pdfStorage.get(activeVersion.storageKey)`.
- If status paid but `storageKey` missing: either regenerate once and store, or return a safe error. For production safety prefer safe error + admin remediation. For compatibility during migration, regenerate and store can be allowed behind a TODO. Decide during implementation.

In unpaid path:
- Generate PDF.
- Build storage key from user/invoice/version/hash.
- Store PDF before transaction.
- In transaction debit wallet, mark version paid, set `storageKey`.

**Step 5: Run focused tests**

```bash
npm test -- tests/download-flow.test.ts tests/race-conditions.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/modules/downloads/pdf-storage.ts src/modules/downloads/service.ts tests/download-flow.test.ts
git commit -m "feat: persist paid invoice pdf artifacts"
```

---

### Task 7: Replace local PDF storage with R2/S3-compatible implementation or production gate

**Files:**
- Modify: `src/modules/downloads/pdf-storage.ts`
- Modify: `.env.example`
- Possibly modify: `package.json`
- Test: create `tests/pdf-storage.test.ts`

**Step 1: Decide storage provider**

Blocking decision needed from owner:
- Cloudflare R2
- AWS S3
- Supabase Storage
- Other S3-compatible

If no credentials/decision: keep local fallback but add explicit production gate:

```ts
if (process.env.NODE_ENV === "production" && process.env.PDF_STORAGE_DRIVER !== "s3") {
  throw new Error("Production PDF storage is not configured");
}
```

**Step 2: Add dependency if using S3/R2**

Run:

```bash
npm install @aws-sdk/client-s3
```

**Step 3: Update env example**

Add to `.env.example`:

```env
PDF_STORAGE_DRIVER=s3
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

Never put real values in repo.

**Step 4: Write tests**

Create `tests/pdf-storage.test.ts` to verify:
- Storage key builder is deterministic.
- Production gate throws when driver/config missing.
- Local driver works only outside production/test-specific override.

**Step 5: Implement S3 storage**

Use `PutObjectCommand` and `GetObjectCommand` from `@aws-sdk/client-s3`.

Do not make final PDFs public. Serve through backend download route only.

**Step 6: Run checks**

```bash
npm test -- tests/pdf-storage.test.ts tests/download-flow.test.ts
npm run typecheck
```

Expected: PASS.

**Step 7: Commit**

```bash
git add package.json package-lock.json .env.example src/modules/downloads/pdf-storage.ts tests/pdf-storage.test.ts
git commit -m "feat: add private pdf artifact storage backend"
```

---

### Task 8: Add real PDF engine dependency or explicit production blocker

**Files:**
- Modify: `package.json`
- Modify: `src/lib/pdf/generator.ts`
- Modify: `.env.example` if needed
- Test: `tests/pdf-generation.test.ts`

**Step 1: Decide runtime**

For Vercel serverless, prefer:

```bash
npm install puppeteer-core @sparticuz/chromium
```

For container/VPS, `puppeteer` may be acceptable:

```bash
npm install puppeteer
```

**Step 2: Update generator loader**

If Vercel serverless:
- Import `@sparticuz/chromium` dynamically.
- Launch `puppeteer-core` with chromium executable path.
- Keep test injection path.

**Step 3: Add a production health check test**

Extend `tests/pdf-generation.test.ts` to assert generated buffer starts with `%PDF` when injected engine succeeds. Existing test already covers injection. Add a separate script/manual smoke for actual engine if CI environment supports it.

**Step 4: Run checks**

```bash
npm test -- tests/pdf-generation.test.ts
npm run typecheck
npm run build
```

Expected: PASS. If actual Chromium cannot run locally, document it as deploy-environment verification required and do not call production-ready.

**Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/pdf/generator.ts .env.example tests/pdf-generation.test.ts
git commit -m "feat: configure runtime pdf engine"
```

---

### Task 9: Seed real template HTML and update admin guidance

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `src/app/admin/templates/new/page.tsx`
- Modify: `src/app/admin/templates/[templateId]/edit/page.tsx`
- Optional docs: `docs/plans/2026-06-12-dokmaker-api-contract.md` or a new template authoring doc.

**Step 1: Write/define two visibly different templates**

Template 1: Professional invoice.
Template 2: GoCar receipt-style layout using available `gocar` optional fields where possible, but still functional for generic content.

Include placeholder examples in admin form helper text:

```text
Gunakan placeholder seperti {{invoice.number}}, {{sender.name}}, {{client.name}}, {{#items}}...{{/items}}, {{total}}.
```

**Step 2: Update seed**

Replace placeholder HTML:

```ts
htmlTemplate: `
  <div class="invoice invoice-professional">...
  {{#items}}...{{/items}}
  </div>
`
```

and GoCar:

```ts
htmlTemplate: `
  <div class="receipt-gocar">...
  {{#items}}...{{/items}}
  </div>
`
```

**Step 3: Run seed only on disposable/dev DB**

Do not run seed against production without owner confirmation.

```bash
npx prisma db seed
```

Expected: seed completes locally/dev.

**Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add prisma/seed.ts src/app/admin/templates/new/page.tsx src/app/admin/templates/[templateId]/edit/page.tsx
git commit -m "chore: add template authoring examples and seed templates"
```

---

### Task 10: Add launch smoke tests and manual checklist evidence

**Files:**
- Modify: `tests/smoke.test.ts`
- Modify: `docs/plans/2026-06-12-dokmaker-smoke-checklist.md` or create launch evidence doc after running.

**Step 1: Add automated smoke coverage**

Add test that renders the same `InvoiceContent` with two different `htmlTemplate` strings and asserts:
- both include the invoice number
- output differs
- preview output contains preview watermark/meta
- final output does not contain preview watermark/meta

**Step 2: Run smoke test**

```bash
npm test -- tests/smoke.test.ts
```

Expected: PASS.

**Step 3: Run full verification suite**

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

Expected: All PASS or documented blocker with exact error.

**Step 4: Manual end-to-end smoke in dev/staging**

Perform and record evidence:
1. Login as user.
2. Select Professional Invoice template.
3. Create invoice.
4. Preview shows Professional layout + watermark.
5. Download final with sufficient wallet.
6. PDF final has Professional layout and no preview watermark.
7. Re-download same version is free and served from stored artifact.
8. Edit paid invoice.
9. New unpaid version is created.
10. Select/create GoCar-style invoice and verify preview/PDF differs visibly.

**Step 5: Document results**

Create `docs/plans/2026-06-20-template-generation-launch-evidence.md` with:
- commands run
- pass/fail output summaries
- manual smoke steps and screenshots/notes if available
- unresolved risks

**Step 6: Commit**

```bash
git add tests/smoke.test.ts docs/plans/2026-06-20-template-generation-launch-evidence.md
git commit -m "test: add template generation launch smoke coverage"
```

---

## Rollback / Forward-Fix Plan

- If renderer introduces preview regressions, temporarily fallback to old `InvoicePreview` component while keeping final generation disabled for unpaid downloads.
- If PDF engine fails in target deploy, block final downloads with safe `PDF_GENERATION_FAILED` message; do not debit wallet.
- If storage is misconfigured in production, hard-fail before marking version paid; do not serve public permanent URLs.
- If a paid version has `storageKey` missing after migration, create an admin repair script that regenerates from the stored `contentSnapshot` and template snapshot strategy. Prefer adding template snapshot in a future migration if templates can be edited after invoice creation.

---

## Known Follow-Up Not Covered in This Plan

- Store `htmlTemplate` snapshot per paid version to preserve exact historical rendering if admin edits the template later. Current DB only stores content snapshot and template relation. For strict immutability, add `templateHtmlSnapshot` to `InvoiceVersion` in a later migration.
- Add unique `(userId, invoiceNumber)` if product owner wants to prevent duplicate invoice numbers.
- Add richer template schema/form fields per template.
- Add PWA manifest/private caching audit if not already completed.

---

## Handoff Checklist

Before implementation starts:
- Confirm storage provider: R2/S3/Supabase Storage.
- Confirm PDF runtime target: Vercel serverless, Vercel function with Chromium support, container, or external renderer.
- Confirm whether local in-memory PDF storage fallback is acceptable only for dev/test.

During implementation:
- Use TDD for every behavior-changing task.
- Do not change wallet balance outside server-side transaction logic.
- Never commit secrets.
- Keep commits small and task-scoped.

Before claiming launch-ready:
- Run full verification suite.
- Complete manual smoke checklist.
- Verify real PDF engine in deployment-equivalent environment.
- Verify private PDF storage and backend-only delivery.
