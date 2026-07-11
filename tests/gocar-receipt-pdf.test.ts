import { describe, expect, it } from "vitest";
import { getDefaultGoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";
import { generateGoCarReceiptPdf } from "@/modules/documents/gocar-receipt-pdf";
import { generateInvoicePdf } from "@/lib/pdf/generator";

describe("GoCar receipt PDF stamp", () => {
  it("serves the original wkhtml PDF for the reference sample", async () => {
    const pdf = await generateGoCarReceiptPdf(getDefaultGoCarReceiptContent());
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20_000);
  });

  it("stamps custom fields onto the blanked base PDF", async () => {
    const content = getDefaultGoCarReceiptContent();
    content.customer.name = "Budi Santoso";
    content.service.orderId = "RB-9999999-00000001";
    content.payment.totalPaid = 75_000;
    content.payment.tripFee = 65_000;
    content.trip.driverName = "AHMAD RIZKI";
    const pdf = await generateGoCarReceiptPdf(content);
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20_000);
    // Must not be a byte-identical copy of the reference sample.
    const sample = await generateGoCarReceiptPdf(getDefaultGoCarReceiptContent());
    expect(pdf.equals(sample)).toBe(false);
  });

  it("routes gocar_receipt through stamp path in generateInvoicePdf", async () => {
    const pdf = await generateInvoicePdf(getDefaultGoCarReceiptContent(), {
      template: {
        htmlTemplate: "<div>unused</div>",
        documentType: "gocar_receipt",
      },
    });
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("can stamp a PREVIEW watermark without changing the clean sample path", async () => {
    const clean = await generateGoCarReceiptPdf(getDefaultGoCarReceiptContent());
    const preview = await generateGoCarReceiptPdf(getDefaultGoCarReceiptContent(), {
      watermark: {
        email: "user@example.com",
        timestamp: "11 Jul 2026, 12.00",
        versionId: "ver_test",
      },
    });
    expect(preview.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(preview.equals(clean)).toBe(false);
    expect(preview.length).toBeGreaterThan(clean.length - 5_000);
  });
});
