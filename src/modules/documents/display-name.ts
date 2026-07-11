/**
 * Party line for lists/dashboard: invoice client or GoCar customer.
 */
export function documentPartyName(content: unknown): string {
  if (!content || typeof content !== "object") return "Tanpa nama";
  const c = content as {
    client?: { name?: unknown };
    customer?: { name?: unknown };
  };
  const client = typeof c.client?.name === "string" ? c.client.name.trim() : "";
  if (client) return client;
  const customer =
    typeof c.customer?.name === "string" ? c.customer.name.trim() : "";
  if (customer) return customer;
  return "Tanpa nama";
}

export function documentTypeBadgeLabel(documentType: string): string {
  if (documentType === "gocar_receipt") return "GoCar";
  if (documentType === "invoice") return "Invoice";
  return documentType;
}
