import { describe, expect, it } from "vitest";
import {
  documentPartyName,
  documentTypeBadgeLabel,
} from "@/modules/documents/display-name";

describe("documentPartyName", () => {
  it("prefers invoice client name", () => {
    expect(
      documentPartyName({ client: { name: "PT A" }, customer: { name: "B" } })
    ).toBe("PT A");
  });

  it("falls back to GoCar customer", () => {
    expect(documentPartyName({ customer: { name: "Budi" } })).toBe("Budi");
  });

  it("returns Tanpa nama when empty", () => {
    expect(documentPartyName({})).toBe("Tanpa nama");
    expect(documentPartyName(null)).toBe("Tanpa nama");
  });
});

describe("documentTypeBadgeLabel", () => {
  it("labels known types", () => {
    expect(documentTypeBadgeLabel("invoice")).toBe("Invoice");
    expect(documentTypeBadgeLabel("gocar_receipt")).toBe("GoCar");
  });
});
