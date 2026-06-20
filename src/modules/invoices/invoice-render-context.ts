import type { InvoiceContent } from "./invoice-content.schema";
import { calculateInvoiceTotal } from "./invoice-content.schema";
import { escapeHtml, formatRupiah } from "@/modules/templates/render-utils";

export function buildInvoiceRenderContext(
  content: InvoiceContent
): Record<string, string> {
  const total = calculateInvoiceTotal(content);

  return {
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
  };
}
