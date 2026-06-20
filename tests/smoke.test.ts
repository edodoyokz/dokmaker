/**
 * DokMaker Launch Smoke Tests
 *
 * Tests that prove the core value proposition:
 * generating invoices from two different templates produces visibly different output.
 */
import { describe, it, expect } from "vitest";
import { generateInvoiceHtml, generateInvoicePdf } from "@/lib/pdf/generator";
import { renderInvoiceTemplateHtml } from "@/modules/templates/render-template";
import { hashInvoiceContent } from "@/modules/invoices/content-hash";
import { invoiceContentSchema } from "@/modules/invoices/invoice-content.schema";
import { calculateInvoiceTotal } from "@/modules/invoices/invoice-content.schema";
import { buildInvoiceFinalPdfStorageKey } from "@/modules/downloads/pdf-storage";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

const sampleContent: InvoiceContent = {
  sender: {
    name: "Studio Kreatif <Design>",
    address: "Jakarta Selatan",
    email: "halo@studiokreatif.test",
    phone: "08123456789",
  },
  client: {
    name: "PT Maju Bersama & Co",
    address: "Bandung",
    email: "klien@majubersama.test",
  },
  meta: {
    invoiceNumber: "INV-2026-001",
    issueDate: "2026-06-20",
    dueDate: "2026-07-04",
    currency: "IDR",
  },
  items: [
    { description: "Branding <Special>", quantity: 2, unitPrice: 750000 },
    { description: "Web Development", quantity: 1, unitPrice: 5000000 },
  ],
  notes: "Terima kasih atas kepercayaan Anda.",
  paymentInstruction: "Transfer ke BCA 1234567890 a.n. Studio Kreatif",
};

const professionalTemplate = `<section data-template="professional">
  <h1>INVOICE</h1>
  <p>{{invoice.number}} — {{invoice.issueDate}}</p>
  <p>From: {{sender.name}}</p>
  <p>To: {{client.name}}</p>
  {{#items}}<p>{{description}}: {{quantity}} × {{unitPrice}} = {{subtotal}}</p>{{/items}}
  <p>Total: {{total}}</p>
  <p>{{notes}}</p>
  {{preview.watermark}}
  {{preview.meta}}
</section>`;

const receiptTemplate = `<section data-template="receipt">
  <h2>RECEIPT / BUKTI PEMBAYARAN</h2>
  <p>Nomor: {{invoice.number}}</p>
  <p>Driver: {{sender.name}}</p>
  <table>
    <tr><td>Jarak</td><td>{{client.address}}</td></tr>
  </table>
  {{#items}}<tr><td>{{description}}</td><td>{{subtotal}}</td></tr>{{/items}}
  <hr>
  <p>Total: {{total}}</p>
</section>`;

describe("Template Differentiation (Smoke)", () => {
  it("professional template produces visibly different HTML from receipt template", () => {
    const profHtml = generateInvoiceHtml(sampleContent, {
      htmlTemplate: professionalTemplate,
    });
    const recHtml = generateInvoiceHtml(sampleContent, {
      htmlTemplate: receiptTemplate,
    });

    // Both contain the invoice number
    expect(profHtml).toContain("INV-2026-001");
    expect(recHtml).toContain("INV-2026-001");

    // Professional uses specific markup
    expect(profHtml).toContain('data-template="professional"');
    expect(recHtml).toContain('data-template="receipt"');

    // Different content
    expect(profHtml).not.toBe(recHtml);

    // Professional has standard invoice header
    expect(profHtml).toContain("INVOICE");
    // Receipt has RECEIPT header
    expect(recHtml).toContain("RECEIPT");
  });

  it("preview mode includes watermark while final mode excludes it", () => {
    const preview = renderInvoiceTemplateHtml({
      htmlTemplate: professionalTemplate,
      content: sampleContent,
      mode: "preview",
      previewMeta: {
        email: "user@test.test",
        timestamp: "20 Jun 2026",
        versionId: "ver_1",
      },
    });

    const final = renderInvoiceTemplateHtml({
      htmlTemplate: professionalTemplate,
      content: sampleContent,
      mode: "final",
    });

    expect(preview).toContain("PREVIEW");
    expect(preview).toContain("user@test.test");
    expect(final).not.toContain("PREVIEW");
    expect(final).not.toContain("user@test.test");
  });

  it("user content is HTML-escaped in render output", () => {
    const html = renderInvoiceTemplateHtml({
      htmlTemplate: "{{sender.name}} | {{client.name}}",
      content: sampleContent,
      mode: "final",
    });

    // The sender name "<Design>" should be escaped
    expect(html).toContain("Studio Kreatif &lt;Design&gt;");
    expect(html).toContain("PT Maju Bersama &amp; Co");
    expect(html).not.toContain("<Design>");
    expect(html).not.toContain("<Special>");
  });
});

describe("Content Hashing (Smoke)", () => {
  it("produces deterministic hash for same content", () => {
    const h1 = hashInvoiceContent(sampleContent);
    const h2 = hashInvoiceContent(sampleContent);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });

  it("produces different hash for different content", () => {
    const h1 = hashInvoiceContent(sampleContent);
    const h2 = hashInvoiceContent({
      ...sampleContent,
      meta: { ...sampleContent.meta, invoiceNumber: "INV-2026-002" },
    });
    expect(h1).not.toBe(h2);
  });
});

describe("Invoice Content Schema (Smoke)", () => {
  it("validates and calculates total correctly", () => {
    const validated = invoiceContentSchema.parse(sampleContent);
    const total = calculateInvoiceTotal(validated);
    expect(total).toBe(2 * 750000 + 1 * 5000000);
  });

  it("rejects content with no items", () => {
    const result = invoiceContentSchema.safeParse({
      ...sampleContent,
      items: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("Storage Key Builder (Smoke)", () => {
  it("builds deterministic storage keys", () => {
    const hash = hashInvoiceContent(sampleContent);

    const k1 = buildInvoiceFinalPdfStorageKey({
      userId: "user-abc",
      invoiceId: "inv-xyz",
      versionId: "ver-1",
      contentHash: hash,
    });

    const k2 = buildInvoiceFinalPdfStorageKey({
      userId: "user-abc",
      invoiceId: "inv-xyz",
      versionId: "ver-1",
      contentHash: hash,
    });

    expect(k1).toBe(k2);
    expect(k1).toContain("invoice-finals/user-abc/inv-xyz/ver-1-");
    expect(k1.endsWith(".pdf")).toBe(true);
  });
});

describe("PDF Generation (Smoke)", () => {
  it("generates PDF buffer when injected engine succeeds", async () => {
    const pdf = await generateInvoicePdf(sampleContent, {
      template: { htmlTemplate: professionalTemplate },
      loadPuppeteer: async () => ({
        default: {
          launch: async () => ({
            newPage: async () => ({
              setContent: async () => undefined,
              pdf: async () => Buffer.from("%PDF-1.7\nreal pdf", "utf-8"),
            }),
            close: async () => undefined,
          }),
        },
      }),
    });

    expect(pdf.subarray(0, 4).toString("utf-8")).toBe("%PDF");
    expect(pdf).toBeInstanceOf(Buffer);
  });

  it("rejects gracefully when PDF engine is unavailable", async () => {
    await expect(
      generateInvoicePdf(sampleContent, {
        loadPuppeteer: async () => {
          throw new Error("missing puppeteer");
        },
      })
    ).rejects.toThrow(/pdf engine/i);
  });
});
