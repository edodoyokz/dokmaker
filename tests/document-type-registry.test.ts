import { describe, expect, it } from "vitest";
import {
  documentTypeRegistry,
  getDocumentTypeDefinition,
  isSupportedDocumentType,
} from "@/modules/documents/document-type-registry";

describe("document type registry", () => {
  it("registers invoice and GoCar receipt document types", () => {
    expect(Object.keys(documentTypeRegistry).sort()).toEqual([
      "gocar_receipt",
      "invoice",
    ]);
    expect(documentTypeRegistry.invoice.label).toBe("Invoice");
    expect(documentTypeRegistry.gocar_receipt.label).toBe("GoCar Receipt");
  });

  it("returns definitions for supported types", () => {
    expect(getDocumentTypeDefinition("invoice").label).toBe("Invoice");
    expect(getDocumentTypeDefinition("gocar_receipt").label).toBe("GoCar Receipt");
  });

  it("throws for unsupported types", () => {
    expect(() => getDocumentTypeDefinition("receipt" as never)).toThrow(
      /unsupported document type/i
    );
  });

  it("checks supported document types", () => {
    expect(isSupportedDocumentType("invoice")).toBe(true);
    expect(isSupportedDocumentType("gocar_receipt")).toBe(true);
    expect(isSupportedDocumentType("unknown")).toBe(false);
  });
});
