import { describe, expect, it } from "vitest";
import { renderInvoiceTemplateHtml } from "@/modules/templates/render-template";
import { renderDocumentHtml } from "@/modules/templates/render-document";
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
      .replace(/<div class="dokmaker-preview-watermark">[\s\S]*?<\/div>/, "")
      .replace(/<div class="dokmaker-preview-meta">[\s\S]*?<\/div>/, "");

    expect(withoutPreviewOnlyNodes).toBe(final);
    expect(preview).toContain("<!DOCTYPE html>");
    expect(preview).toContain("@page { size: A4; margin: 0; }");
    expect(preview).toContain("position: fixed");
    expect(preview).toContain("inset: 0");
    expect(preview).toContain("background-image:");
    expect(preview).toContain("background-repeat: repeat");
    expect(preview).toContain("top: 8px");
    expect(preview).toContain("right: 8px");
  });
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
