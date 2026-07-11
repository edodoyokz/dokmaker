import { describe, expect, it } from "vitest";
import { buildDownloadFilename } from "@/modules/downloads/service";

describe("buildDownloadFilename", () => {
  it("strips path and control characters from title", () => {
    expect(buildDownloadFilename('evil\r\n"../x.pdf', null, "inv-1", 2)).toBe(
      "evil..x.pdf-v2.pdf"
    );
  });

  it("falls back to invoice id when title empty", () => {
    expect(buildDownloadFilename("   ", null, "inv-99", 1)).toBe("inv-99-v1.pdf");
  });
});
