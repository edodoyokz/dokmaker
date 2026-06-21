import { describe, expect, it } from "vitest";
import { safeApiError } from "@/lib/errors";

describe("safeApiError", () => {
  it("returns the original message for allowlisted user-facing errors", () => {
    expect(safeApiError(new Error("Unauthorized"))).toBe("Unauthorized");
    expect(safeApiError(new Error("Invoice tidak ditemukan"))).toBe(
      "Invoice tidak ditemukan"
    );
    expect(safeApiError(new Error("Status versi tidak valid"))).toBe(
      "Status versi tidak valid"
    );
  });

  it("returns dynamic saldo message verbatim (402 path relies on this)", () => {
    const msg =
      "Saldo tidak mencukupi. Diperlukan Rp10.000";
    expect(safeApiError(new Error(msg))).toBe(msg);
  });

  it("collapses internal config errors to a generic message", () => {
    expect(
      safeApiError(new Error("Pakasir API key not configured"))
    ).toBe("Internal server error");
    expect(
      safeApiError(new Error("Pakasir project slug not configured"))
    ).toBe("Internal server error");
  });

  it("collapses non-Error throwables to a generic message", () => {
    expect(safeApiError("random string")).toBe("Internal server error");
    expect(safeApiError(undefined)).toBe("Internal server error");
  });

  it("supports custom fallback", () => {
    expect(
      safeApiError(new Error("Pakasir API key not configured"), "Webhook error")
    ).toBe("Webhook error");
  });
});
