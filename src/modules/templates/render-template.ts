import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import { calculateInvoiceTotal } from "@/modules/invoices/invoice-content.schema";

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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

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

export function renderInvoiceTemplateHtml({
  htmlTemplate,
  content,
  mode,
  previewMeta,
}: RenderInvoiceTemplateHtmlInput): string {
  const total = calculateInvoiceTotal(content);

  const scalarValues: Record<string, string> = {
    "invoice.number": escapeHtml(content.meta.invoiceNumber),
    "invoice.issueDate": escapeHtml(content.meta.issueDate),
    "invoice.dueDate": escapeHtml(content.meta.dueDate),
    "invoice.currency": escapeHtml(content.meta.currency),
    "sender.name": escapeHtml(content.sender.name),
    "sender.address": escapeHtml(content.sender.address),
    "sender.email": escapeHtml(content.sender.email),
    "sender.phone": escapeHtml(content.sender.phone),
    "client.name": escapeHtml(content.client.name),
    "client.address": escapeHtml(content.client.address),
    "client.email": escapeHtml(content.client.email),
    "client.phone": escapeHtml(content.client.phone),
    notes: escapeHtml(content.notes),
    paymentInstruction: escapeHtml(content.paymentInstruction),
    total: formatRupiah(total),
    "preview.watermark": renderPreviewWatermark(mode),
    "preview.meta": renderPreviewMeta(mode, previewMeta),
  };

  let html = htmlTemplate.replace(
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

  html = html.replace(
    /{{\s*([\w.]+)\s*}}/g,
    (_match, key: string) => scalarValues[key] ?? ""
  );

  return html;
}
