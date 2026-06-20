import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import type { DocumentType } from "@/modules/documents/types";
import {
  getDocumentTypeDefinition,
  isSupportedDocumentType,
} from "@/modules/documents/document-type-registry";
import { escapeHtml, formatRupiah } from "./render-utils";

type RenderMode = "preview" | "final";

type PreviewMeta = {
  email: string;
  timestamp: string;
  versionId: string;
};

export type RenderInvoiceTemplateHtmlInput = {
  htmlTemplate: string;
  content: InvoiceContent;
  mode: RenderMode;
  previewMeta?: PreviewMeta;
};

export type RenderDocumentTemplateHtmlInput = {
  htmlTemplate: string;
  documentType: DocumentType | string;
  content: unknown;
  mode: RenderMode;
  previewMeta?: PreviewMeta;
};

function renderPreviewWatermark(mode: RenderMode): string {
  if (mode !== "preview") return "";
  return '<div class="dokmaker-preview-watermark">PREVIEW</div>';
}

function renderPreviewMeta(
  mode: RenderMode,
  previewMeta?: PreviewMeta
): string {
  if (mode !== "preview" || !previewMeta) return "";
  return [
    '<div class="dokmaker-preview-meta">',
    `<p>Preview only • ${escapeHtml(previewMeta.email)}</p>`,
    `<p>Generated: ${escapeHtml(previewMeta.timestamp)}</p>`,
    `<p>Version: ${escapeHtml(previewMeta.versionId)}</p>`,
    "</div>",
  ].join("");
}

function renderInvoiceItemsBlock(
  html: string,
  content: InvoiceContent
): string {
  return html.replace(
    /{{#items}}([\s\S]*?){{\/items}}/g,
    (_match, itemTemplate: string) => {
      return content.items
        .map((item) => {
          const itemValues: Record<string, string> = {
            description: escapeHtml(item.description),
            quantity: escapeHtml(item.quantity),
            unitPrice: formatRupiah(item.unitPrice),
            subtotal: formatRupiah(item.quantity * item.unitPrice),
          };

          return itemTemplate.replace(
            /{{\s*([\w.]+)\s*}}/g,
            (_itemMatch, key: string) => itemValues[key] ?? ""
          );
        })
        .join("");
    }
  );
}

function replaceScalarPlaceholders(
  html: string,
  values: Record<string, string>
): string {
  return html.replace(
    /{{\s*([\w.]+)\s*}}/g,
    (_match, key: string) => values[key] ?? ""
  );
}

export function renderDocumentTemplateHtml({
  htmlTemplate,
  documentType,
  content,
  mode,
  previewMeta,
}: RenderDocumentTemplateHtmlInput): string {
  const resolvedType = isSupportedDocumentType(documentType)
    ? documentType
    : "invoice";
  const definition = getDocumentTypeDefinition(resolvedType);
  const parsed = definition.schema.parse(content);

  const scalarValues: Record<string, string> = {
    ...(definition.buildRenderContext as (content: unknown) => Record<string, string>)(parsed),
    "preview.watermark": renderPreviewWatermark(mode),
    "preview.meta": renderPreviewMeta(mode, previewMeta),
  };

  let html = htmlTemplate;

  if (resolvedType === "invoice") {
    html = renderInvoiceItemsBlock(html, parsed as InvoiceContent);
  }

  return replaceScalarPlaceholders(html, scalarValues);
}

export function renderInvoiceTemplateHtml({
  htmlTemplate,
  content,
  mode,
  previewMeta,
}: RenderInvoiceTemplateHtmlInput): string {
  return renderDocumentTemplateHtml({
    htmlTemplate,
    documentType: "invoice",
    content,
    mode,
    previewMeta,
  });
}
