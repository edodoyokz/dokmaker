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
}

export default function TemplatePreview({ htmlTemplate, documentType, content, previewMeta }: Props) {
  const html = renderDocumentHtml({
    htmlTemplate,
    documentType: (isSupportedDocumentType(documentType) ? documentType : "invoice") as DocumentType,
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
