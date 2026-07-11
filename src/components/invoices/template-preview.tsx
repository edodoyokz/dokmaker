"use client";

import { renderDocumentHtml } from "@/modules/templates/render-document";
import { isSupportedDocumentType } from "@/modules/documents/document-type-registry";
import type { DocumentType } from "@/modules/documents/types";

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
  // Same-origin API URL (not blob:) so CSP default-src 'self' allows the iframe.
  if (documentType === "gocar_receipt" && invoiceId) {
    return (
      <iframe
        title="Preview dokumen GoCar"
        src={`/api/invoices/${invoiceId}/preview`}
        className="block h-[2246px] w-[794px] border-0 bg-white"
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
    <iframe
      title="Preview dokumen"
      srcDoc={html}
      sandbox=""
      className={`block ${documentType === "gocar_receipt" ? "h-[2246px]" : "h-[1123px]"} w-[794px] border-0 bg-white`}
    />
  );
}
