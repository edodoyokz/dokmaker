import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const templatePreview = readFileSync(
  "src/components/invoices/template-preview.tsx",
  "utf8"
);
const pdfStamp = readFileSync(
  "src/components/invoices/pdf-stamp-preview.tsx",
  "utf8"
);
const previewClient = readFileSync(
  "src/app/app/invoices/[invoiceId]/preview/preview-client.tsx",
  "utf8"
);

describe("TemplatePreview", () => {
  it("routes gocar_receipt through rasterized stamp preview, not native PDF chrome", () => {
    expect(templatePreview).toContain('documentType === "gocar_receipt"');
    expect(templatePreview).toContain("PdfStampPreview");
    expect(templatePreview).toContain("renderDocumentHtml");
    expect(templatePreview).toContain("srcDoc={html}");
    expect(templatePreview).toContain('sandbox=""');
    expect(templatePreview).not.toContain("dangerouslySetInnerHTML");
    expect(templatePreview).not.toContain("createObjectURL");
  });
});

describe("PdfStampPreview", () => {
  it("fetches watermarked PDF and rasterizes pages client-side", () => {
    expect(pdfStamp).toContain("/api/invoices/");
    expect(pdfStamp).toContain("/preview");
    expect(pdfStamp).toContain("pdfjs-dist");
    expect(pdfStamp).toContain("getDocument");
    expect(pdfStamp).toContain("toDataURL");
    expect(pdfStamp).toContain("Menyiapkan pratinjau");
    expect(pdfStamp).toContain("Coba lagi");
  });
});

describe("PreviewClient UX", () => {
  it("is mobile-first with sticky CTA and honest draft copy", () => {
    expect(previewClient).toContain("FINAL_DOWNLOAD_PRICE");
    expect(previewClient).toContain("fixed inset-x-0 bottom-0");
    expect(previewClient).toContain("draft berwatermark");
    expect(previewClient).toContain("bukan file final");
    expect(previewClient).not.toContain("text-zinc-350");
    expect(previewClient).not.toContain("balance - 10000");
    expect(previewClient).not.toContain("Workspace Invoice");
  });
});
