import { invoiceContentSchema } from "@/modules/invoices/invoice-content.schema";
import { getDefaultInvoiceContent } from "./default-content";
import {
  gocarReceiptContentSchema,
  getDefaultGoCarReceiptContent,
} from "./gocar-receipt-content.schema";
import type { DocumentType, DocumentTypeDefinition } from "./types";
import { DOCUMENT_TYPES } from "./types";

export const documentTypeRegistry = {
  invoice: {
    type: "invoice",
    label: "Invoice",
    schema: invoiceContentSchema,
    getDefaultContent: getDefaultInvoiceContent,
  },
  gocar_receipt: {
    type: "gocar_receipt",
    label: "GoCar Receipt",
    schema: gocarReceiptContentSchema,
    getDefaultContent: getDefaultGoCarReceiptContent,
  },
} satisfies Record<DocumentType, DocumentTypeDefinition<unknown>>;

export function isSupportedDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function getDocumentTypeDefinition(type: string) {
  if (!isSupportedDocumentType(type)) {
    throw new Error(`Unsupported document type: ${type}`);
  }

  return documentTypeRegistry[type];
}
