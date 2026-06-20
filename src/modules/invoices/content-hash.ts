import { createHash } from "node:crypto";
import type { InvoiceContent } from "./invoice-content.schema";

/**
 * Deterministic JSON-like stringify that sorts object keys so key order
 * does not affect the resulting hash.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashInvoiceContent(content: InvoiceContent): string {
  return createHash("sha256").update(stableStringify(content)).digest("hex");
}
