"use client";

import { renderInvoiceTemplateHtml } from "@/modules/templates/render-template";
import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

interface Props {
  htmlTemplate: string;
  content: InvoiceContent;
  previewMeta: {
    email: string;
    timestamp: string;
    versionId: string;
  };
}

export default function TemplatePreview({ htmlTemplate, content, previewMeta }: Props) {
  const html = renderInvoiceTemplateHtml({
    htmlTemplate,
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
