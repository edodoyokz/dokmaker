import { describe, it, expect } from "vitest";
import {
  invoiceContentSchema,
  calculateInvoiceTotal,
  type InvoiceContent,
} from "@/modules/invoices/invoice-content.schema";

describe("Invoice Content Schema", () => {
  const validContent: InvoiceContent = {
    sender: { name: "PT Contoh" },
    client: { name: "Client A" },
    meta: {
      invoiceNumber: "INV-001",
      issueDate: "2026-01-15",
      currency: "IDR",
    },
    items: [
      { description: "Jasa Desain", quantity: 2, unitPrice: 500000 },
      { description: "Jasa Development", quantity: 1, unitPrice: 2000000 },
    ],
  };

  it("should accept valid invoice content", () => {
    const result = invoiceContentSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it("should reject missing sender name", () => {
    const invalid = { ...validContent, sender: { name: "" } };
    const result = invoiceContentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject missing client name", () => {
    const invalid = { ...validContent, client: { name: "" } };
    const result = invoiceContentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject empty items array", () => {
    const invalid = { ...validContent, items: [] };
    const result = invoiceContentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject negative quantity", () => {
    const invalid = {
      ...validContent,
      items: [{ description: "Test", quantity: -1, unitPrice: 100 }],
    };
    const result = invoiceContentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject negative unit price", () => {
    const invalid = {
      ...validContent,
      items: [{ description: "Test", quantity: 1, unitPrice: -100 }],
    };
    const result = invoiceContentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should accept zero unit price (free items)", () => {
    const content = {
      ...validContent,
      items: [{ description: "Free Item", quantity: 1, unitPrice: 0 }],
    };
    const result = invoiceContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });
});

describe("calculateInvoiceTotal", () => {
  it("should calculate total correctly", () => {
    const content: InvoiceContent = {
      sender: { name: "A" },
      client: { name: "B" },
      meta: { invoiceNumber: "1", issueDate: "2026-01-01", currency: "IDR" },
      items: [
        { description: "Item 1", quantity: 2, unitPrice: 50000 },
        { description: "Item 2", quantity: 1, unitPrice: 100000 },
      ],
    };
    expect(calculateInvoiceTotal(content)).toBe(200000);
  });

  it("should return 0 for empty items", () => {
    // Note: schema requires min 1 item, but testing the function directly
    const content = {
      sender: { name: "A" },
      client: { name: "B" },
      meta: { invoiceNumber: "1", issueDate: "2026-01-01", currency: "IDR" },
      items: [],
    } as unknown as InvoiceContent;
    expect(calculateInvoiceTotal(content)).toBe(0);
  });
});
