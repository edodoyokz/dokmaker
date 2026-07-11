"use client";

import { renderDocumentHtml } from "@/modules/templates/render-document";
import { isSupportedDocumentType } from "@/modules/documents/document-type-registry";
import type { DocumentType } from "@/modules/documents/types";
import PdfStampPreview from "@/components/invoices/pdf-stamp-preview";

interface Props {
  htmlTemplate: string;
  documentType: string;
  content: unknown;
  previewMeta: {
    email: string;
    timestamp: string;
    versionId: string;
  };
  /** Required for gocar_receipt stamp preview (same PDF path as final download). */
  invoiceId?: string;
}

export default function TemplatePreview({
  htmlTemplate,
  documentType,
  content,
  previewMeta,
  invoiceId,
}: Props) {
  if (documentType === "gocar_receipt" && invoiceId) {
    return (
      <PdfStampPreview
        invoiceId={invoiceId}
        reloadKey={previewMeta.versionId}
      />
    );
  }

  const html = renderDocumentHtml({
    htmlTemplate,
    documentType: (isSupportedDocumentType(documentType)
      ? documentType
      : "invoice") as DocumentType,
    content,
    mode: "preview",
    previewMeta,
  });

  // Fit A4 (794×1123) to container width via container query units — no h-scroll on 360px.
  return (
    <div
      className="mx-auto w-full max-w-[794px] overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm"
      style={{ containerType: "inline-size" }}
    >
      <div
        className="relative w-full"
        style={{ height: "calc(1123 * 100cqw / 794)" }}
      >
        <iframe
          title="Preview dokumen"
          srcDoc={html}
          sandbox=""
          className="absolute left-0 top-0 border-0 bg-white"
          style={{
            width: 794,
            height: 1123,
            transform: "scale(calc(100cqw / 794))",
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
