# Generic Document Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor DokMaker from invoice-only generation into a generic document engine that supports both normal invoices and editable two-page GoCar receipts based on the provided reference screenshots.

**Architecture:** Use a generic document domain (`Document`, `DocumentVersion`, `DocumentTemplate`) with a `documentType` registry. Each document type owns its Zod schema, render context builder, default content, and UI form. The existing invoice flow becomes `documentType = "invoice"`; GoCar receipt becomes `documentType = "gocar_receipt"`.

**Tech Stack:** Next.js App Router, TypeScript, React, Prisma, PostgreSQL, Zod, Vitest, Cloudflare R2/S3 storage, Puppeteer/Chromium PDF rendering.

---

## Current context

Design doc: `docs/plans/2026-06-20-generic-document-engine-design.md`.

The project currently has invoice-specific naming in these key files:

- Prisma: `prisma/schema.prisma`
- Seed: `prisma/seed.ts`
- Invoice service: `src/modules/invoices/service.ts`
- Invoice schema: `src/modules/invoices/invoice-content.schema.ts`
- Renderer: `src/modules/templates/render-template.ts`
- Downloads: `src/modules/downloads/service.ts`, `src/modules/downloads/pdf-storage.ts`
- API routes: `src/app/api/invoices/**`
- UI routes: `src/app/app/invoices/**`
- Tests: `tests/download-flow.test.ts`, `tests/template-rendering.test.ts`, `tests/pdf-generation.test.ts`

Financial invariants remain mandatory:

- No client-side wallet mutations.
- Wallet ledger remains append-only.
- Debit + ledger insert + paid mark + storage key update must be atomic.
- Duplicate download requests must not double-debit.
- Final PDFs remain private in R2 and are served only through authenticated backend route.

---

## Task 1: Add document type primitives without Prisma rename

**Purpose:** Create the document type registry and GoCar schema while keeping existing Prisma invoice tables untouched. This reduces risk and lets rendering tests pass before the large rename.

**Files:**
- Create: `src/modules/documents/types.ts`
- Create: `src/modules/documents/gocar-receipt-content.schema.ts`
- Create: `src/modules/documents/default-content.ts`
- Create: `src/modules/documents/document-type-registry.ts`
- Test: `tests/document-type-registry.test.ts`
- Test: `tests/gocar-receipt-schema.test.ts`

### Step 1: Write failing registry test

Create `tests/document-type-registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  documentTypeRegistry,
  getDocumentTypeDefinition,
  isSupportedDocumentType,
} from "@/modules/documents/document-type-registry";

describe("document type registry", () => {
  it("registers invoice and GoCar receipt document types", () => {
    expect(Object.keys(documentTypeRegistry).sort()).toEqual([
      "gocar_receipt",
      "invoice",
    ]);
    expect(documentTypeRegistry.invoice.label).toBe("Invoice");
    expect(documentTypeRegistry.gocar_receipt.label).toBe("GoCar Receipt");
  });

  it("returns definitions for supported types", () => {
    expect(getDocumentTypeDefinition("invoice").label).toBe("Invoice");
    expect(getDocumentTypeDefinition("gocar_receipt").label).toBe("GoCar Receipt");
  });

  it("throws for unsupported types", () => {
    expect(() => getDocumentTypeDefinition("receipt" as never)).toThrow(
      /unsupported document type/i
    );
  });

  it("checks supported document types", () => {
    expect(isSupportedDocumentType("invoice")).toBe(true);
    expect(isSupportedDocumentType("gocar_receipt")).toBe(true);
    expect(isSupportedDocumentType("unknown")).toBe(false);
  });
});
```

### Step 2: Write failing GoCar schema test

Create `tests/gocar-receipt-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  gocarReceiptContentSchema,
  getDefaultGoCarReceiptContent,
} from "@/modules/documents/gocar-receipt-content.schema";

describe("gocarReceiptContentSchema", () => {
  it("accepts reference GoCar receipt content", () => {
    const parsed = gocarReceiptContentSchema.parse(getDefaultGoCarReceiptContent());

    expect(parsed.service.name).toBe("GoCar");
    expect(parsed.service.orderId).toBe("RB-4153088-49607870");
    expect(parsed.customer.name).toBe("Bernadus Putra");
    expect(parsed.payment.totalPaid).toBe(50000);
    expect(parsed.trip.driverName).toBe("UDIN SAPRUDIN");
    expect(parsed.issuer.npwp).toBe("0745704361064000");
  });

  it("requires customer name and order id", () => {
    const invalid = getDefaultGoCarReceiptContent();
    invalid.customer.name = "";
    invalid.service.orderId = "";

    const result = gocarReceiptContentSchema.safeParse(invalid);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("customer.name");
      expect(paths).toContain("service.orderId");
    }
  });

  it("rejects negative money values", () => {
    const invalid = getDefaultGoCarReceiptContent();
    invalid.payment.totalPaid = -1;

    expect(gocarReceiptContentSchema.safeParse(invalid).success).toBe(false);
  });
});
```

### Step 3: Run tests and verify failure

Run:

```bash
npm test -- tests/document-type-registry.test.ts tests/gocar-receipt-schema.test.ts
```

Expected: fail because modules do not exist.

### Step 4: Implement `types.ts`

Create `src/modules/documents/types.ts`:

```ts
import type { z } from "zod";

export const DOCUMENT_TYPES = ["invoice", "gocar_receipt"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentTypeDefinition<TContent> = {
  type: DocumentType;
  label: string;
  schema: z.ZodType<TContent>;
  getDefaultContent: () => TContent;
};
```

### Step 5: Implement GoCar schema

Create `src/modules/documents/gocar-receipt-content.schema.ts`:

```ts
import { z } from "zod";

export const gocarReceiptContentSchema = z.object({
  service: z.object({
    name: z.string().min(1).default("GoCar"),
    orderDate: z.string().min(1, "Tanggal pesanan wajib diisi"),
    orderId: z.string().min(1, "ID pesanan wajib diisi"),
  }),
  customer: z.object({
    name: z.string().min(1, "Nama customer wajib diisi"),
  }),
  payment: z.object({
    totalPaid: z.number().nonnegative(),
    tripFee: z.number().nonnegative(),
    appFee: z.number().nonnegative(),
    appFeeDiscount: z.number().nonnegative().default(0),
    method: z.string().min(1).default("GoPay"),
  }),
  trip: z.object({
    driverName: z.string().min(1, "Nama driver wajib diisi"),
    vehiclePlate: z.string().min(1, "Nomor kendaraan wajib diisi"),
    vehicleModel: z.string().optional(),
    distance: z.string().optional(),
    duration: z.string().optional(),
    pickupTime: z.string().optional(),
    pickupName: z.string().optional(),
    pickupAddress: z.string().optional(),
    dropoffTime: z.string().optional(),
    dropoffName: z.string().optional(),
    dropoffAddress: z.string().optional(),
  }),
  issuer: z.object({
    companyName: z.string().optional(),
    npwp: z.string().optional(),
    address: z.string().optional(),
  }),
});

export type GoCarReceiptContent = z.infer<typeof gocarReceiptContentSchema>;

export function getDefaultGoCarReceiptContent(): GoCarReceiptContent {
  return {
    service: {
      name: "GoCar",
      orderDate: "Kamis, 11 Juni 2026",
      orderId: "RB-4153088-49607870",
    },
    customer: {
      name: "Bernadus Putra",
    },
    payment: {
      totalPaid: 50000,
      tripFee: 42500,
      appFee: 7500,
      appFeeDiscount: 0,
      method: "GoPay",
    },
    trip: {
      driverName: "UDIN SAPRUDIN",
      vehiclePlate: "B2036UZX",
      vehicleModel: "Toyota Calya",
      distance: "8.8 km",
      duration: "32 menit",
      pickupTime: "11 Juni 2026 jam 15:25",
      pickupName: "Sentral Senayan 1 - 2",
      pickupAddress: "Gelora, Tanahabang, Jakarta Pusat, DKI Jakarta",
      dropoffTime: "11 Juni 2026 jam 15:57",
      dropoffName: "Stasiun Gambir",
      dropoffAddress:
        "Jl. Medan Merdeka Timur No.1, Gambir, Gambir, Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10110, Indonesia",
    },
    issuer: {
      companyName: "PT GoTo Gojek Tokopedia Tbk",
      npwp: "0745704361064000",
      address:
        "Gedung Pasaraya Blok M Gd.B Lt.6&7, Jl. Iskandarsyah II, 2, Melawai, Kebayoran Baru, Kota Adm. Jakarta Selatan, DKI Jakarta, 12160",
    },
  };
}
```

### Step 6: Implement invoice default content helper

Create `src/modules/documents/default-content.ts`:

```ts
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import { getDefaultGoCarReceiptContent } from "./gocar-receipt-content.schema";

export function getDefaultInvoiceContent(): InvoiceContent {
  return {
    sender: {
      name: "Nama Bisnis Anda",
      address: "Alamat bisnis",
      email: "billing@example.com",
      phone: "081234567890",
    },
    client: {
      name: "Nama Klien",
      address: "Alamat klien",
      email: "client@example.com",
      phone: "081298765432",
    },
    meta: {
      invoiceNumber: "INV-2026-001",
      issueDate: "2026-06-20",
      dueDate: "2026-06-27",
      currency: "IDR",
    },
    items: [
      {
        description: "Jasa profesional",
        quantity: 1,
        unitPrice: 100000,
      },
    ],
    notes: "Terima kasih atas kepercayaannya.",
    paymentInstruction: "Transfer ke rekening yang tertera.",
  };
}

export { getDefaultGoCarReceiptContent };
```

### Step 7: Implement registry

Create `src/modules/documents/document-type-registry.ts`:

```ts
import { invoiceContentSchema } from "@/modules/invoices/invoice-content.schema";
import { getDefaultInvoiceContent } from "./default-content";
import {
  gocarReceiptContentSchema,
  getDefaultGoCarReceiptContent,
} from "./gocar-receipt-content.schema";
import type { DocumentType, DocumentTypeDefinition } from "./types";
import { DOCUMENT_TYPES } from "./types";

export const documentTypeRegistry = {
  invoice: {
    type: "invoice",
    label: "Invoice",
    schema: invoiceContentSchema,
    getDefaultContent: getDefaultInvoiceContent,
  },
  gocar_receipt: {
    type: "gocar_receipt",
    label: "GoCar Receipt",
    schema: gocarReceiptContentSchema,
    getDefaultContent: getDefaultGoCarReceiptContent,
  },
} satisfies Record<DocumentType, DocumentTypeDefinition<unknown>>;

export function isSupportedDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function getDocumentTypeDefinition(type: string) {
  if (!isSupportedDocumentType(type)) {
    throw new Error(`Unsupported document type: ${type}`);
  }

  return documentTypeRegistry[type];
}
```

### Step 8: Run tests and commit

Run:

```bash
npm test -- tests/document-type-registry.test.ts tests/gocar-receipt-schema.test.ts
npm run typecheck
```

Expected: pass.

Commit:

```bash
git add src/modules/documents tests/document-type-registry.test.ts tests/gocar-receipt-schema.test.ts
git commit -m "feat: add document type registry and gocar receipt schema"
```

---

## Task 2: Add generic render context support

**Purpose:** Render templates for either `invoice` or `gocar_receipt` safely.

**Files:**
- Create: `src/modules/templates/render-utils.ts`
- Create: `src/modules/documents/gocar-receipt-render-context.ts`
- Create: `src/modules/invoices/invoice-render-context.ts`
- Modify: `src/modules/templates/render-template.ts`
- Test: `tests/gocar-receipt-rendering.test.ts`
- Modify: `tests/template-rendering.test.ts`

### Step 1: Write failing GoCar rendering test

Create `tests/gocar-receipt-rendering.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDefaultGoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";
import { renderDocumentTemplateHtml } from "@/modules/templates/render-template";

const template = `
  <style>.page-break { page-break-before: always; }</style>
  <section>
    {{preview.watermark}}
    <div>{{service.name}}</div>
    <div>{{service.orderDate}}</div>
    <div>{{service.orderId}}</div>
    <div>Hai {{customer.name}},</div>
    <div>{{payment.totalPaid}}</div>
    <div>{{payment.tripFee}}</div>
    <div>{{payment.appFee}}</div>
    <div>{{payment.appFeeDiscount}}</div>
    <div>{{payment.method}}</div>
    <div>{{trip.driverName}}</div>
    <div>{{trip.vehiclePlate}} • {{trip.vehicleModel}}</div>
    <div>{{trip.pickupName}}</div>
    <div>{{trip.dropoffName}}</div>
    <div>{{issuer.companyName}} • NPWP: {{issuer.npwp}}</div>
  </section>
  <section class="page-break">Faktur</section>
`;

describe("GoCar receipt rendering", () => {
  it("renders all GoCar receipt placeholders", () => {
    const html = renderDocumentTemplateHtml({
      htmlTemplate: template,
      documentType: "gocar_receipt",
      content: getDefaultGoCarReceiptContent(),
      mode: "final",
    });

    expect(html).toContain("GoCar");
    expect(html).toContain("RB-4153088-49607870");
    expect(html).toContain("Hai Bernadus Putra,");
    expect(html).toContain("Rp50.000");
    expect(html).toContain("UDIN SAPRUDIN");
    expect(html).toContain("B2036UZX • Toyota Calya");
    expect(html).toContain("Stasiun Gambir");
    expect(html).toContain("NPWP: 0745704361064000");
    expect(html).toContain("page-break");
  });

  it("escapes user editable values", () => {
    const content = getDefaultGoCarReceiptContent();
    content.customer.name = `<script>alert("x")</script>`;
    content.trip.pickupAddress = "A & B < C";

    const html = renderDocumentTemplateHtml({
      htmlTemplate: `{{customer.name}} {{trip.pickupAddress}}`,
      documentType: "gocar_receipt",
      content,
      mode: "final",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("A &amp; B &lt; C");
  });

  it("adds preview watermark only in preview mode", () => {
    const preview = renderDocumentTemplateHtml({
      htmlTemplate: `{{preview.watermark}} {{preview.meta}}`,
      documentType: "gocar_receipt",
      content: getDefaultGoCarReceiptContent(),
      mode: "preview",
      previewMeta: {
        email: "user@example.com",
        timestamp: "2026-06-20T00:00:00.000Z",
        versionId: "version-1",
      },
    });

    const final = renderDocumentTemplateHtml({
      htmlTemplate: `{{preview.watermark}} {{preview.meta}}`,
      documentType: "gocar_receipt",
      content: getDefaultGoCarReceiptContent(),
      mode: "final",
    });

    expect(preview).toContain("PREVIEW");
    expect(preview).toContain("user@example.com");
    expect(final).not.toContain("PREVIEW");
  });
});
```

### Step 2: Run test and verify failure

Run:

```bash
npm test -- tests/gocar-receipt-rendering.test.ts
```

Expected: fail because `renderDocumentTemplateHtml` does not exist.

### Step 3: Extract safe render utilities

Create `src/modules/templates/render-utils.ts`:

```ts
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}
```

### Step 4: Add invoice render context

Create `src/modules/invoices/invoice-render-context.ts`:

```ts
import type { InvoiceContent } from "./invoice-content.schema";
import { calculateInvoiceTotal } from "./invoice-content.schema";
import { escapeHtml, formatRupiah } from "@/modules/templates/render-utils";

export function buildInvoiceRenderContext(content: InvoiceContent): Record<string, string> {
  const total = calculateInvoiceTotal(content);

  return {
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
  };
}
```

### Step 5: Add GoCar render context

Create `src/modules/documents/gocar-receipt-render-context.ts`:

```ts
import type { GoCarReceiptContent } from "./gocar-receipt-content.schema";
import { escapeHtml, formatRupiah } from "@/modules/templates/render-utils";

export function buildGoCarReceiptRenderContext(
  content: GoCarReceiptContent
): Record<string, string> {
  const paymentTotal =
    content.payment.tripFee + content.payment.appFee - content.payment.appFeeDiscount;

  return {
    "service.name": escapeHtml(content.service.name),
    "service.orderDate": escapeHtml(content.service.orderDate),
    "service.orderId": escapeHtml(content.service.orderId),
    "customer.name": escapeHtml(content.customer.name),
    "payment.totalPaid": formatRupiah(content.payment.totalPaid),
    "payment.tripFee": formatRupiah(content.payment.tripFee),
    "payment.appFee": formatRupiah(content.payment.appFee),
    "payment.appFeeDiscount": formatRupiah(content.payment.appFeeDiscount),
    "payment.total": formatRupiah(paymentTotal),
    "payment.method": escapeHtml(content.payment.method),
    "trip.driverName": escapeHtml(content.trip.driverName),
    "trip.vehiclePlate": escapeHtml(content.trip.vehiclePlate),
    "trip.vehicleModel": escapeHtml(content.trip.vehicleModel),
    "trip.distance": escapeHtml(content.trip.distance),
    "trip.duration": escapeHtml(content.trip.duration),
    "trip.pickupTime": escapeHtml(content.trip.pickupTime),
    "trip.pickupName": escapeHtml(content.trip.pickupName),
    "trip.pickupAddress": escapeHtml(content.trip.pickupAddress),
    "trip.dropoffTime": escapeHtml(content.trip.dropoffTime),
    "trip.dropoffName": escapeHtml(content.trip.dropoffName),
    "trip.dropoffAddress": escapeHtml(content.trip.dropoffAddress),
    "issuer.companyName": escapeHtml(content.issuer.companyName),
    "issuer.npwp": escapeHtml(content.issuer.npwp),
    "issuer.address": escapeHtml(content.issuer.address),
  };
}
```

### Step 6: Update registry with render contexts

Modify `src/modules/documents/types.ts`:

```ts
export type DocumentTypeDefinition<TContent> = {
  type: DocumentType;
  label: string;
  schema: z.ZodType<TContent>;
  getDefaultContent: () => TContent;
  buildRenderContext: (content: TContent) => Record<string, string>;
};
```

Modify `src/modules/documents/document-type-registry.ts` to include `buildRenderContext` for both types.

### Step 7: Update renderer

Modify `src/modules/templates/render-template.ts`:

- Import `getDocumentTypeDefinition`, `DocumentType`, `InvoiceContent`, `buildInvoiceRenderContext`, `escapeHtml`, `formatRupiah`.
- Export `renderDocumentTemplateHtml`.
- Keep `renderInvoiceTemplateHtml` as wrapper.
- Keep `{{#items}}...{{/items}}` rendering only for invoice content.

Core implementation:

```ts
export type RenderDocumentTemplateHtmlInput = {
  htmlTemplate: string;
  documentType: DocumentType;
  content: unknown;
  mode: RenderMode;
  previewMeta?: PreviewMeta;
};

export function renderDocumentTemplateHtml({
  htmlTemplate,
  documentType,
  content,
  mode,
  previewMeta,
}: RenderDocumentTemplateHtmlInput): string {
  const definition = getDocumentTypeDefinition(documentType);
  const parsed = definition.schema.parse(content);

  const scalarValues: Record<string, string> = {
    ...definition.buildRenderContext(parsed),
    "preview.watermark": renderPreviewWatermark(mode),
    "preview.meta": renderPreviewMeta(mode, previewMeta),
  };

  let html = htmlTemplate;

  if (documentType === "invoice") {
    html = renderInvoiceItemsBlock(html, parsed as InvoiceContent);
  }

  return replaceScalarPlaceholders(html, scalarValues);
}
```

### Step 8: Run focused tests

Run:

```bash
npm test -- tests/gocar-receipt-rendering.test.ts tests/template-rendering.test.ts
npm run typecheck
```

Expected: pass.

### Step 9: Commit

```bash
git add src/modules/templates src/modules/invoices/invoice-render-context.ts src/modules/documents tests/gocar-receipt-rendering.test.ts tests/template-rendering.test.ts
git commit -m "feat: render templates by document type"
```

---

## Task 3: Add `documentType` to templates and invoices without full rename yet

**Purpose:** Make current DB support document types while avoiding a huge all-at-once Prisma rename. This incremental approach is safer; full model rename can be a later cleanup.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Modify: `src/modules/templates/service.ts` if present
- Modify: admin template routes/pages that use template model
- Test: update existing tests if mocks include template fields

### Step 1: Modify Prisma schema

In `model InvoiceTemplate`, add:

```prisma
documentType String @default("invoice") @map("document_type")
```

In `model Invoice`, add:

```prisma
documentType String @default("invoice") @map("document_type")
title        String? // generic display title
```

Keep existing names for now:

- `InvoiceTemplate`
- `Invoice`
- `InvoiceVersion`
- `invoice_templates`
- `invoices`
- `invoice_versions`

Rationale: app behavior becomes generic without a massive rename. We can rename routes/UI separately. This is a deliberate deviation from the design doc to reduce implementation risk.

### Step 2: Generate migration

Run:

```bash
npx prisma migrate dev --name add-document-types
npx prisma validate
```

Expected: migration adds two columns, no table drops.

### Step 3: Update seed template records

Modify `prisma/seed.ts`:

- All invoice templates: `documentType: "invoice"`
- GoCar template: `documentType: "gocar_receipt"`

### Step 4: Update tests/mocks

If any test mocks `invoiceTemplate` or `invoice` and TypeScript complains, add `documentType` and `title` fields.

### Step 5: Verify and commit

Run:

```bash
npx prisma validate
npm run typecheck
npm test
```

Commit:

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts src tests
git commit -m "feat: add document type metadata to invoice domain"
```

---

## Task 4: Add two-page GoCar receipt seed template

**Purpose:** Replace the simplified GoCar seed with a realistic two-page editable template based on `page-1.png` and `page-2.png`.

**Files:**
- Modify: `prisma/seed.ts`
- Test: `tests/gocar-receipt-rendering.test.ts`

### Step 1: Add/extend rendering test for real template shape

In `tests/gocar-receipt-rendering.test.ts`, add:

```ts
it("renders a two-page GoCar receipt with receipt and faktur sections", () => {
  const html = renderDocumentTemplateHtml({
    htmlTemplate: REAL_GOCAR_TEMPLATE_SNIPPET,
    documentType: "gocar_receipt",
    content: getDefaultGoCarReceiptContent(),
    mode: "final",
  });

  expect(html).toContain("Makasih udah pesan GoCar");
  expect(html).toContain("Rincian pembayaran");
  expect(html).toContain("Detail perjalanan");
  expect(html).toContain("Faktur");
  expect(html).toContain("Semua jumlah sudah termasuk PPN");
  expect(html).toContain("page-break");
});
```

### Step 2: Update seed template

In `prisma/seed.ts`, replace GoCar template HTML with a two-page template.

Use these placeholders:

```text
{{service.name}}
{{service.orderDate}}
{{service.orderId}}
{{customer.name}}
{{payment.totalPaid}}
{{payment.tripFee}}
{{payment.appFee}}
{{payment.appFeeDiscount}}
{{payment.total}}
{{payment.method}}
{{trip.driverName}}
{{trip.vehiclePlate}}
{{trip.vehicleModel}}
{{trip.distance}}
{{trip.duration}}
{{trip.pickupTime}}
{{trip.pickupName}}
{{trip.pickupAddress}}
{{trip.dropoffTime}}
{{trip.dropoffName}}
{{trip.dropoffAddress}}
{{issuer.companyName}}
{{issuer.npwp}}
{{issuer.address}}
{{preview.watermark}}
{{preview.meta}}
```

Include CSS:

```css
.gocar-doc { font-family: Helvetica, Arial, sans-serif; color: #1f2933; background: #fff; }
.gocar-page { width: 100%; max-width: 760px; margin: 0 auto; min-height: 1040px; background: #fff; }
.gocar-header { display: flex; justify-content: space-between; align-items: center; background: #00aa6c; color: #fff; padding: 22px 32px; }
.gocar-brand { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
.gocar-order { text-align: right; font-size: 13px; line-height: 1.45; }
.gocar-body { padding: 34px 44px; }
.gocar-total-amount { color: #00aa6c; font-size: 32px; font-weight: 800; }
.gocar-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px; margin: 18px 0; }
.gocar-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; }
.gocar-row.total { border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 14px; font-weight: 800; }
.gocar-muted { color: #6b7280; }
.gocar-section-title { font-size: 18px; font-weight: 800; margin: 28px 0 12px; }
.gocar-trip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.gocar-footer { border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 18px; font-size: 11px; color: #6b7280; line-height: 1.55; }
.gocar-page-break { page-break-before: always; break-before: page; }
@media (max-width: 640px) { .gocar-body { padding: 24px; } .gocar-trip-grid { grid-template-columns: 1fr; } }
```

### Step 3: Verify seed compiles

Run:

```bash
npm run typecheck
npm test -- tests/gocar-receipt-rendering.test.ts
```

Do not run `prisma db seed` unless explicitly needed.

### Step 4: Commit

```bash
git add prisma/seed.ts tests/gocar-receipt-rendering.test.ts
git commit -m "feat: add two-page editable gocar receipt template"
```

---

## Task 5: Make create/edit service validate content by document type

**Purpose:** Current invoice service validates only invoice content. It must validate based on selected template/documentType so GoCar receipts can be created/edited safely.

**Files:**
- Modify: `src/modules/invoices/service.ts`
- Modify: `src/modules/invoices/content-hash.ts` if needed
- Test: `tests/document-service.test.ts` or update existing invoice service tests

### Step 1: Inspect existing service tests

Run:

```bash
ls tests/*invoice* tests/*document* 2>/dev/null || true
```

If no service-specific tests exist, create `tests/document-service.test.ts` with Prisma mocks following existing test patterns.

### Step 2: Write failing tests

Test cases:

1. `createInvoice` / new `createDocument` accepts invoice content with invoice template.
2. It accepts GoCar content with GoCar template.
3. It rejects GoCar content for invoice template.
4. It stores `documentType` on the invoice/document row.
5. Updating paid version creates new unpaid version with new content hash (existing behavior preserved).

### Step 3: Update service input types

In `src/modules/invoices/service.ts`:

- Add `documentType?: string` to create input, but prefer template's `documentType` over client input.
- Fetch template first.
- Validate content using:

```ts
const definition = getDocumentTypeDefinition(template.documentType);
const parsedContent = definition.schema.parse(input.content);
```

- Set invoice row:

```ts
documentType: template.documentType,
title: deriveDocumentTitle(template.documentType, parsedContent),
invoiceNumber: template.documentType === "invoice" ? parsedContent.meta.invoiceNumber : null,
```

Add helper:

```ts
function deriveDocumentTitle(documentType: string, content: unknown): string {
  if (documentType === "invoice") return (content as InvoiceContent).meta.invoiceNumber;
  if (documentType === "gocar_receipt") {
    const c = content as GoCarReceiptContent;
    return `${c.service.name} ${c.service.orderId}`;
  }
  return "Untitled document";
}
```

### Step 4: Run focused tests

Run:

```bash
npm test -- tests/document-service.test.ts tests/invoice-content-hash.test.ts
npm run typecheck
```

### Step 5: Commit

```bash
git add src/modules/invoices/service.ts tests/document-service.test.ts
git commit -m "feat: validate document content by template type"
```

---

## Task 6: Update PDF generation and preview/download to use document type

**Purpose:** Ensure preview and final PDF rendering use `renderDocumentTemplateHtml` with the document type from DB.

**Files:**
- Modify: `src/lib/pdf/generator.ts`
- Modify: `src/modules/downloads/service.ts`
- Modify: `src/app/app/invoices/[invoiceId]/preview/page.tsx`
- Modify: `src/components/invoices/template-preview.tsx` or equivalent preview component
- Test: `tests/download-flow.test.ts`
- Test: `tests/pdf-generation.test.ts`

### Step 1: Write/adjust failing tests

Update tests so template objects include `documentType`.

Add assertion in PDF generation test:

```ts
it("renders GoCar final PDF HTML from document template", async () => {
  const html = generateInvoiceHtml(getDefaultGoCarReceiptContent(), {
    documentType: "gocar_receipt",
    htmlTemplate: GOCAR_TEST_TEMPLATE,
  });

  expect(html).toContain("RB-4153088-49607870");
  expect(html).toContain("Faktur");
});
```

If `generateInvoiceHtml` name remains invoice-specific, keep name temporarily but add `documentType` option.

### Step 2: Update generator options

In `src/lib/pdf/generator.ts`, change template option shape:

```ts
template?: {
  htmlTemplate: string;
  documentType?: DocumentType | string;
}
```

When template exists:

```ts
return renderDocumentTemplateHtml({
  htmlTemplate: template.htmlTemplate,
  documentType: isSupportedDocumentType(template.documentType ?? "invoice")
    ? template.documentType
    : "invoice",
  content,
  mode: options.mode,
  previewMeta: options.previewMeta,
});
```

### Step 3: Update download service

In `src/modules/downloads/service.ts`, when fetching invoice + template, pass:

```ts
template: {
  htmlTemplate: activeVersion.invoice.template.htmlTemplate,
  documentType: activeVersion.invoice.template.documentType,
}
```

Or use invoice/document row `documentType` if available.

### Step 4: Update preview page/component

Pass `documentType` to `renderDocumentTemplateHtml`.

### Step 5: Verify and commit

Run:

```bash
npm test -- tests/download-flow.test.ts tests/pdf-generation.test.ts tests/gocar-receipt-rendering.test.ts
npm run typecheck
```

Commit:

```bash
git add src/lib/pdf/generator.ts src/modules/downloads/service.ts src/app/app/invoices src/components tests
git commit -m "feat: render preview and final pdf by document type"
```

---

## Task 7: Add GoCar create/edit UI fields

**Purpose:** Allow users to edit GoCar receipt data, not just use a static seed template.

**Files:**
- Modify: `src/app/app/invoices/new/page.tsx`
- Modify: `src/app/app/invoices/[invoiceId]/edit/edit-form.tsx`
- Optional create: `src/components/documents/gocar-receipt-form-fields.tsx`
- Optional create: `src/components/documents/invoice-form-fields.tsx`

### Step 1: Inspect current form implementation

Read:

```bash
src/app/app/invoices/new/page.tsx
src/app/app/invoices/[invoiceId]/edit/edit-form.tsx
```

### Step 2: Add conditional form fields

When selected template `documentType === "gocar_receipt"`, render fieldsets:

- Pesanan: service name, order date, order ID
- Customer: name
- Pembayaran: trip fee, app fee, discount, total paid, method
- Perjalanan: driver, vehicle plate/model, distance, duration
- Jemput: pickup time, pickup name, pickup address
- Tujuan: dropoff time, dropoff name, dropoff address
- Penerbit Faktur: company name, NPWP, address

When template is `invoice`, keep existing invoice form.

### Step 3: Submit shape

Ensure POST body sends `content` matching schema:

```ts
{
  templateId,
  content: gocarReceiptContent,
}
```

Do not trust client-sent documentType; server uses template's `documentType`.

### Step 4: Verify

Run:

```bash
npm run typecheck
npm run build
```

Manual smoke locally:

- Open `/app/invoices/new`.
- Select GoCar template.
- Confirm GoCar fields appear.
- Submit creates document.

### Step 5: Commit

```bash
git add src/app/app/invoices src/components/documents
git commit -m "feat: add editable gocar receipt form fields"
```

---

## Task 8: Add generic `/documents` routes while keeping invoice aliases

**Purpose:** Align product direction with document generator without breaking existing code all at once.

**Files:**
- Create/move: `src/app/app/documents/**`
- Create/move: `src/app/api/documents/**`
- Keep/modify: `src/app/app/invoices/**` as redirects or aliases
- Keep/modify: `src/app/api/invoices/**` as wrappers or aliases

### Step 1: Create app route aliases

Create `/app/documents` by copying current `/app/invoices` pages.

For old `/app/invoices` routes, either:

- keep working, or
- redirect to `/app/documents` using `redirect` from `next/navigation`.

Prefer keep working during transition unless build complexity gets high.

### Step 2: Create API route aliases

Create `/api/documents` routes with same logic as `/api/invoices` but renamed params `documentId`.

Keep `/api/invoices` wrappers calling the same service for backwards compatibility.

### Step 3: Update SW safety list if needed

Current `public/sw.js` bypasses `/api/*`, `/app/*`, `/admin/*`, so `/api/documents` and `/app/documents` are already covered. No change required.

### Step 4: Verify

Run:

```bash
npm run typecheck
npm run build
npm test
```

### Step 5: Commit

```bash
git add src/app/app/documents src/app/api/documents src/app/app/invoices src/app/api/invoices
git commit -m "feat: add document routes with invoice compatibility aliases"
```

---

## Task 9: Full Prisma model rename cleanup (optional but recommended before launch)

**Purpose:** Clean up naming from invoice-specific to document-specific after behavior is working.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: all Prisma references in `src/**` and `tests/**`
- Migration file

### Step 1: Rename Prisma models

Rename:

```text
InvoiceTemplate → DocumentTemplate
Invoice → Document
InvoiceVersion → DocumentVersion
InvoiceStatus → DocumentStatus
InvoiceVersionStatus → DocumentVersionStatus
```

Use maps:

```prisma
@@map("document_templates")
@@map("documents")
@@map("document_versions")
```

Because there is no production data, a clean migration is acceptable.

### Step 2: Update references

Search and replace carefully:

```bash
rg "invoiceTemplate|invoiceVersion|invoice\b|InvoiceTemplate|InvoiceVersion|InvoiceStatus|InvoiceVersionStatus" src tests prisma
```

Update services, tests, API route names, variable names.

### Step 3: Regenerate Prisma

Run:

```bash
npx prisma migrate dev --name rename-invoice-models-to-documents
npx prisma validate
npm run typecheck
npm test
```

### Step 4: Commit

```bash
git add prisma src tests
git commit -m "refactor: rename invoice prisma models to documents"
```

**Note:** If this task becomes too large, defer it. Tasks 1-8 already deliver the user-visible requirement.

---

## Task 10: Final verification and launch evidence

**Purpose:** Verify the full document engine is safe and functional.

**Files:**
- Create: `docs/plans/2026-06-20-generic-document-engine-launch-evidence.md`

### Step 1: Run full verification

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

Expected: all pass.

### Step 2: Add launch evidence doc

Create `docs/plans/2026-06-20-generic-document-engine-launch-evidence.md` with:

- Summary of implemented changes.
- Changed files grouped by domain.
- Verification command outputs.
- Financial safety review notes.
- Manual smoke steps still required in Vercel.
- Residual risks.

### Step 3: Commit

```bash
git add docs/plans/2026-06-20-generic-document-engine-launch-evidence.md
git commit -m "docs: add launch evidence for generic document engine"
```

---

## Recommended execution strategy

Execute Tasks 1-8 first. Task 9 is a cleanup refactor; do it only after user-visible GoCar receipt flow works and tests pass. This avoids a massive rename blocking the feature.

## Acceptance criteria

- User can choose a GoCar Receipt template.
- User can edit all data shown in the two provided GoCar reference pages.
- Preview renders GoCar layout with watermark.
- Final PDF renders GoCar layout without watermark.
- Same paid GoCar version re-download is free and uses persisted R2 artifact.
- Invoice templates still work.
- All automated tests pass.
- Full verification commands pass.
