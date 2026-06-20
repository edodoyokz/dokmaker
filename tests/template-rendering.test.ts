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
      htmlTemplate:
        "{{#items}}<p>{{description}} {{quantity}} {{unitPrice}} {{subtotal}}</p>{{/items}} Total {{total}}",
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
      previewMeta: {
        email: "user@example.test",
        timestamp: "20 Jun 2026",
        versionId: "ver_1",
      },
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
