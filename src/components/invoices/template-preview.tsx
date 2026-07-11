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
  // Stamp path: rasterize watermarked PDF (no browser PDF chrome / download UI).
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

  return (
    <div className="mx-auto w-full max-w-[794px] overflow-x-auto rounded-md border border-zinc-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
      <iframe
        title="Preview dokumen"
        srcDoc={html}
        sandbox=""
        className="block h-[1123px] w-[794px] max-w-none border-0 bg-white"
      />
    </div>
  );
}
