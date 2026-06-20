import { describe, expect, it } from "vitest";
import { generateInvoiceHtml, generateInvoicePdf } from "@/lib/pdf/generator";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

const sampleContent: InvoiceContent = {
  sender: {
    name: "DokMaker Studio",
    address: "Jakarta",
    email: "hello@dokmaker.test",
  },
  client: {
    name: "Client Example",
    address: "Bandung",
    email: "client@example.test",
  },
  meta: {
    invoiceNumber: "INV-001",
    issueDate: "2026-06-12",
    dueDate: "2026-06-19",
    currency: "IDR",
  },
  items: [
    {
      description: "Design work",
      quantity: 2,
      unitPrice: 150000,
    },
  ],
  notes: "Terima kasih",
  paymentInstruction: "Transfer ke rekening ABC",
};

describe("generateInvoiceHtml", () => {
  it("renders invoice metadata into HTML", () => {
    const html = generateInvoiceHtml(sampleContent);

    expect(html).toContain("INVOICE");
    expect(html).toContain("INV-001");
    expect(html).toContain("DokMaker Studio");
    expect(html).toContain("Client Example");
  });

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
});

describe("generateInvoicePdf", () => {
  it("rejects final pdf generation when no pdf engine is available", async () => {
    await expect(
      generateInvoicePdf(sampleContent, {
        loadPuppeteer: async () => {
          throw new Error("missing puppeteer");
        },
      })
    ).rejects.toThrow(/pdf engine/i);
  });

  it("returns a real PDF buffer when injected engine succeeds", async () => {
    const pdfBuffer = await generateInvoicePdf(sampleContent, {
      loadPuppeteer: async () => ({
        default: {
          launch: async () => ({
            newPage: async () => ({
              setContent: async () => undefined,
              pdf: async () => Buffer.from("%PDF-1.7\nmock pdf", "utf-8"),
            }),
            close: async () => undefined,
          }),
        },
      }),
    });

    expect(pdfBuffer.subarray(0, 4).toString("utf-8")).toBe("%PDF");
  });
});
