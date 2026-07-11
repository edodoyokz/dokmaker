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
    expect(parsed.customer.name).toBe("Nama Pelanggan");
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

    const result = gocarReceiptContentSchema.safeParse(invalid);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("payment.totalPaid");
    }
  });
});
