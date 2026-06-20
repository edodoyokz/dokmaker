import { invoiceContentSchema } from "@/modules/invoices/invoice-content.schema";
import { buildInvoiceRenderContext } from "@/modules/invoices/invoice-render-context";
import { getDefaultInvoiceContent } from "./default-content";
import {
  gocarReceiptContentSchema,
  getDefaultGoCarReceiptContent,
} from "./gocar-receipt-content.schema";
import { buildGoCarReceiptRenderContext } from "./gocar-receipt-render-context";
import type { DocumentType } from "./types";
import { DOCUMENT_TYPES } from "./types";

/**
 * Runtime shape of a registry entry. The content generic is intentionally
 * erased here so the registry can hold entries with different content types
 * without resorting to `any`. Schema parsing and render-context building are
 * paired per entry, keeping the content contract safe at runtime.
 */
type RuntimeDocumentTypeDefinition = {
  type: DocumentType;
  label: string;
  schema: { parse: (input: unknown) => unknown };
  getDefaultContent: () => unknown;
  buildRenderContext: (content: unknown) => Record<string, string>;
};

/**
 * Builder preserves the concrete content type per entry at the call site,
 * then erases it when storing into the runtime registry.
 */
function defineDocumentType<TContent>(
  definition: {
    type: DocumentType;
    label: string;
    schema: { parse: (input: unknown) => TContent };
    getDefaultContent: () => TContent;
    buildRenderContext: (content: TContent) => Record<string, string>;
  }
): RuntimeDocumentTypeDefinition {
  return {
    type: definition.type,
    label: definition.label,
    schema: definition.schema,
    getDefaultContent: definition.getDefaultContent,
    buildRenderContext: definition.buildRenderContext as (
      content: unknown
    ) => Record<string, string>,
  };
}

export const documentTypeRegistry: Record<
  DocumentType,
  RuntimeDocumentTypeDefinition
> = {
  invoice: defineDocumentType({
    type: "invoice",
    label: "Invoice",
    schema: invoiceContentSchema,
    getDefaultContent: getDefaultInvoiceContent,
    buildRenderContext: buildInvoiceRenderContext,
  }),
  gocar_receipt: defineDocumentType({
    type: "gocar_receipt",
    label: "GoCar Receipt",
    schema: gocarReceiptContentSchema,
    getDefaultContent: getDefaultGoCarReceiptContent,
    buildRenderContext: buildGoCarReceiptRenderContext,
  }),
};

export function isSupportedDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function getDocumentTypeDefinition(
  type: string
): RuntimeDocumentTypeDefinition {
  if (!isSupportedDocumentType(type)) {
    throw new Error(`Unsupported document type: ${type}`);
  }

  return documentTypeRegistry[type];
}
