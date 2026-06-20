import { invoiceContentSchema } from "@/modules/invoices/invoice-content.schema";
import { buildInvoiceRenderContext } from "@/modules/invoices/invoice-render-context";
import { getDefaultInvoiceContent } from "./default-content";
import {
  gocarReceiptContentSchema,
  getDefaultGoCarReceiptContent,
} from "./gocar-receipt-content.schema";
import { buildGoCarReceiptRenderContext } from "./gocar-receipt-render-context";
import type { DocumentType, DocumentTypeDefinition } from "./types";
import { DOCUMENT_TYPES } from "./types";

export const documentTypeRegistry = {
  invoice: {
    type: "invoice",
    label: "Invoice",
    schema: invoiceContentSchema,
    getDefaultContent: getDefaultInvoiceContent,
    buildRenderContext: buildInvoiceRenderContext,
  },
  gocar_receipt: {
    type: "gocar_receipt",
    label: "GoCar Receipt",
    schema: gocarReceiptContentSchema,
    getDefaultContent: getDefaultGoCarReceiptContent,
    buildRenderContext: buildGoCarReceiptRenderContext,
  },
} satisfies Record<DocumentType, DocumentTypeDefinition<any>>;

export function isSupportedDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function getDocumentTypeDefinition(type: string) {
  if (!isSupportedDocumentType(type)) {
    throw new Error(`Unsupported document type: ${type}`);
  }

  return documentTypeRegistry[type];
}
