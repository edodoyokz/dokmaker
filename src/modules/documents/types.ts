import type { z } from "zod";

export const DOCUMENT_TYPES = ["invoice", "gocar_receipt"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentTypeDefinition<TContent> = {
  type: DocumentType;
  label: string;
  schema: z.ZodType<TContent>;
  getDefaultContent: () => TContent;
  buildRenderContext: (content: TContent) => Record<string, string>;
};
