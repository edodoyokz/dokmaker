import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/components/invoices/template-preview.tsx",
  "utf8"
);

describe("TemplatePreview", () => {
  it("isolates the shared document in a sandboxed iframe", () => {
    expect(source).toContain("renderDocumentHtml");
    expect(source).toContain("<iframe");
    expect(source).toContain("srcDoc={html}");
    expect(source).toContain('sandbox=""');
    expect(source).toContain('documentType === "gocar_receipt" ? "h-[2246px]" : "h-[1123px]"');
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
