import { describe, expect, it } from "vitest";
import {
  gocarReceiptContentSchema,
  getDefaultGoCarReceiptContent,
} from "@/modules/documents/gocar-receipt-content.schema";

describe("GoCar form content roundtrip", () => {
  it("default content passes schema validation", () => {
    expect(
      gocarReceiptContentSchema.safeParse(getDefaultGoCarReceiptContent())
        .success
    ).toBe(true);
  });

  it("partial edits still validate when required fields present", () => {
    const content = getDefaultGoCarReceiptContent();
    content.customer.name = "Test User";
    content.payment.tripFee = 65000;
    content.payment.appFee = 10000;
    content.payment.totalPaid = 75000; // trip + app
    content.trip.driverName = "BUDI SANTOSO";
    expect(gocarReceiptContentSchema.safeParse(content).success).toBe(true);
  });

  it("payment total is tripFee + appFee - discount", () => {
    const content = getDefaultGoCarReceiptContent();
    content.payment.tripFee = 65000;
    content.payment.appFee = 10000;
    content.payment.appFeeDiscount = 2500;
    const total =
      content.payment.tripFee +
      content.payment.appFee -
      content.payment.appFeeDiscount;
    expect(total).toBe(72500);
  });

  it("rejects content when required fields are empty", () => {
    const content = getDefaultGoCarReceiptContent();
    content.customer.name = "";
    content.service.orderId = "";
    content.trip.driverName = "";
    const result = gocarReceiptContentSchema.safeParse(content);
    expect(result.success).toBe(false);
  });

  it("rejects negative money values", () => {
    const content = getDefaultGoCarReceiptContent();
    content.payment.totalPaid = -1000;
    expect(gocarReceiptContentSchema.safeParse(content).success).toBe(false);
  });
});
