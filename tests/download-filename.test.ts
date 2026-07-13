import { describe, expect, it } from "vitest";
import {
  buildDownloadFilename,
  preferredDownloadBaseName,
} from "@/modules/downloads/service";

describe("buildDownloadFilename", () => {
  it("strips path and control characters from title", () => {
    expect(buildDownloadFilename('evil\r\n"../x.pdf', null, "inv-1", 2)).toBe(
      "evil..x.pdf-v2.pdf"
    );
  });

  it("falls back to invoice id when title empty", () => {
    expect(buildDownloadFilename("   ", null, "inv-99", 1)).toBe("inv-99-v1.pdf");
  });

  it("prefers order id / invoice number over display title", () => {
    expect(
      buildDownloadFilename("GoCar RB-1", null, "inv-1", 1, "RB-4153088-49607870")
    ).toBe("RB-4153088-49607870-v1.pdf");
  });
});

describe("preferredDownloadBaseName", () => {
  it("uses GoCar service.orderId", () => {
    expect(
      preferredDownloadBaseName("gocar_receipt", {
        service: { orderId: "RB-4153088-49607870" },
      })
    ).toBe("RB-4153088-49607870");
  });

  it("uses invoice meta.invoiceNumber", () => {
    expect(
      preferredDownloadBaseName("invoice", {
        meta: { invoiceNumber: "INV-2026-001" },
      })
    ).toBe("INV-2026-001");
  });
});
