import { describe, it, expect } from "vitest";
import {
  FINAL_DOWNLOAD_PRICE,
  ALLOWED_TOPUP_AMOUNTS,
} from "@/modules/pricing/constants";

describe("Pricing Constants", () => {
  it("FINAL_DOWNLOAD_PRICE should be 10000", () => {
    expect(FINAL_DOWNLOAD_PRICE).toBe(10000);
  });

  it("ALLOWED_TOPUP_AMOUNTS should contain only 50000 and 100000", () => {
    expect(ALLOWED_TOPUP_AMOUNTS).toContain(50000);
    expect(ALLOWED_TOPUP_AMOUNTS).toContain(100000);
    expect(ALLOWED_TOPUP_AMOUNTS).toHaveLength(2);
  });

  it("should not allow arbitrary top up amounts", () => {
    const invalidAmounts = [10000, 25000, 75000, 200000];
    invalidAmounts.forEach((amount) => {
      expect(ALLOWED_TOPUP_AMOUNTS.includes(amount as 50000 | 100000)).toBe(
        false
      );
    });
  });
});
