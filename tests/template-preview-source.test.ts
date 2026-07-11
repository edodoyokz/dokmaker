import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/components/invoices/template-preview.tsx",
  "utf8"
);

describe("TemplatePreview", () => {
  it("uses same-origin stamp PDF for gocar_receipt and sandboxed HTML for others", () => {
    expect(source).toContain('documentType === "gocar_receipt"');
    expect(source).toContain("/api/invoices/");
    expect(source).toContain("/preview");
    expect(source).not.toContain("createObjectURL");
    expect(source).not.toContain("blob:");
    expect(source).toContain("renderDocumentHtml");
    expect(source).toContain("<iframe");
    expect(source).toContain("srcDoc={html}");
    expect(source).toContain('sandbox=""');
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
