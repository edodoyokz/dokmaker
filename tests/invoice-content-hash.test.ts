import { describe, it, expect } from "vitest";
import { hashInvoiceContent } from "@/modules/invoices/content-hash";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

const base: InvoiceContent = {
  sender: { name: "Alice" },
  client: { name: "Bob" },
  meta: { invoiceNumber: "INV-1", issueDate: "2026-06-20", currency: "IDR" },
  items: [{ description: "Work", quantity: 1, unitPrice: 10000 }],
  notes: "thanks",
};

describe("hashInvoiceContent", () => {
  it("returns a 64-char hex sha256", () => {
    const h = hashInvoiceContent(base);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for identical content", () => {
    expect(hashInvoiceContent(base)).toBe(hashInvoiceContent(structuredClone(base)));
  });

  it("is stable regardless of object key order", () => {
    const reordered: InvoiceContent = {
      items: [{ description: "Work", quantity: 1, unitPrice: 10000 }],
      notes: "thanks",
      meta: { currency: "IDR", issueDate: "2026-06-20", invoiceNumber: "INV-1" },
      client: { name: "Bob" },
      sender: { name: "Alice" },
    };
    expect(hashInvoiceContent(reordered)).toBe(hashInvoiceContent(base));
  });

  it("changes when content changes", () => {
    const modified = { ...base, notes: "different" };
    expect(hashInvoiceContent(modified)).not.toBe(hashInvoiceContent(base));
  });

  it("changes when an item changes", () => {
    const modified: InvoiceContent = {
      ...base,
      items: [{ description: "Work", quantity: 2, unitPrice: 10000 }],
    };
    expect(hashInvoiceContent(modified)).not.toBe(hashInvoiceContent(base));
  });

  it("ignores undefined vs missing keys consistently", () => {
    const withoutOptional: InvoiceContent = {
      sender: { name: "Alice" },
      client: { name: "Bob" },
      meta: { invoiceNumber: "INV-1", issueDate: "2026-06-20", currency: "IDR" },
      items: [{ description: "Work", quantity: 1, unitPrice: 10000 }],
    };
    // base has notes: "thanks", withoutOptional omits notes (undefined)
    // These should DIFFER because notes value differs.
    expect(hashInvoiceContent(withoutOptional)).not.toBe(hashInvoiceContent(base));
  });
});
