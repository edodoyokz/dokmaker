import { describe, expect, it } from "vitest";
import {
  invoiceContentSchema,
  type InvoiceContent,
} from "@/modules/invoices/invoice-content.schema";
import {
  gocarReceiptContentSchema,
  getDefaultGoCarReceiptContent,
  type GoCarReceiptContent,
} from "@/modules/documents/gocar-receipt-content.schema";
import { adminTemplatePayloadSchema } from "@/lib/validation/admin-template.schema";

function makeValidInvoiceContent(): InvoiceContent {
  return {
    sender: { name: "PT Contoh" },
    client: { name: "Client A" },
    meta: {
      invoiceNumber: "INV-001",
      issueDate: "2026-01-15",
      currency: "IDR",
    },
    items: [{ description: "Jasa", quantity: 1, unitPrice: 100000 }],
  };
}

describe("invoice content size limits", () => {
  it("rejects sender.name longer than 200 characters", () => {
    const content = makeValidInvoiceContent();
    content.sender.name = "A".repeat(201);
    const result = invoiceContentSchema.safeParse(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("sender.name");
    }
  });

  it("rejects items array longer than 100", () => {
    const content = makeValidInvoiceContent();
    content.items = Array.from({ length: 101 }, (_, i) => ({
      description: `Item ${i}`,
      quantity: 1,
      unitPrice: 1000,
    }));
    const result = invoiceContentSchema.safeParse(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("items");
    }
  });

  it("rejects notes longer than 10000 characters", () => {
    const content = makeValidInvoiceContent();
    content.notes = "A".repeat(10001);
    const result = invoiceContentSchema.safeParse(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("notes");
    }
  });

  it("accepts content at the boundary limits", () => {
    const content = makeValidInvoiceContent();
    content.sender.name = "A".repeat(200);
    content.client.address = "B".repeat(2000);
    content.notes = "C".repeat(10000);
    content.items = Array.from({ length: 100 }, (_, i) => ({
      description: `Item ${i}`.repeat(10),
      quantity: 1,
      unitPrice: 1000,
    }));
    const result = invoiceContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });
});

describe("gocar receipt content size limits", () => {
  it("rejects customer.name longer than 200 characters", () => {
    const content = getDefaultGoCarReceiptContent();
    content.customer.name = "A".repeat(201);
    const result = gocarReceiptContentSchema.safeParse(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("customer.name");
    }
  });

  it("rejects trip.pickupAddress longer than 2000 characters", () => {
    const content = getDefaultGoCarReceiptContent();
    content.trip.pickupAddress = "A".repeat(2001);
    const result = gocarReceiptContentSchema.safeParse(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("trip.pickupAddress");
    }
  });

  it("rejects issuer.npwp longer than 500 characters", () => {
    const content = getDefaultGoCarReceiptContent();
    content.issuer.npwp = "0".repeat(501);
    const result = gocarReceiptContentSchema.safeParse(content);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("issuer.npwp");
    }
  });

  it("accepts content at the boundary limits", () => {
    const content = getDefaultGoCarReceiptContent();
    content.customer.name = "A".repeat(200);
    content.trip.pickupAddress = "B".repeat(2000);
    content.issuer.address = "C".repeat(2000);
    const result = gocarReceiptContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });
});

describe("admin template payload size limits", () => {
  it("rejects htmlTemplate longer than 500000 characters", () => {
    const payload = {
      name: "GoCar Receipt",
      htmlTemplate: "<div>".repeat(125001),
    };
    const result = adminTemplatePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("htmlTemplate");
    }
  });

  it("rejects name longer than 200 characters", () => {
    const payload = {
      name: "A".repeat(201),
      htmlTemplate: "<div>template</div>",
    };
    const result = adminTemplatePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("name");
    }
  });

  it("accepts payload at the boundary limits", () => {
    const payload = {
      name: "A".repeat(200),
      description: "B".repeat(5000),
      htmlTemplate: "x".repeat(499980),
    };
    const result = adminTemplatePayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
