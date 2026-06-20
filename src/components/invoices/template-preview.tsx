"use client";

import { renderDocumentTemplateHtml } from "@/modules/templates/render-template";
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
  const html = renderDocumentTemplateHtml({
    htmlTemplate,
    documentType: (isSupportedDocumentType(documentType) ? documentType : "invoice") as DocumentType,
    content,
    mode: "preview",
    previewMeta,
  });

  return (
    <div
      className="dokmaker-template-preview relative bg-white text-zinc-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
