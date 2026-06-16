import type { Prisma } from "@prisma/client";

/**
 * Minimal structural client surface writeAuditLog needs. Defined structurally
 * (rather than via Pick<Prisma.TransactionClient, ...>) so partial mocks and
 * both the global client and a transaction client are assignable.
 */
export interface AuditLogClient {
  adminAuditLog: {
    create: (args: {
      data: Prisma.AdminAuditLogUncheckedCreateInput | Prisma.AdminAuditLogCreateInput;
    }) => Promise<unknown>;
  };
}

export interface AuditLogInput {
  /** Admin performing the action (from requireAdmin()). */
  adminUserId: string;
  /** Stable action identifier, e.g. "create_template", "manual_adjustment_credit". */
  action: string;
  /** Entity type touched, e.g. "invoice_template", "wallet". */
  targetType: string;
  /** Id of the touched entity. */
  targetId: string;
  /** Arbitrary structured detail. Must NOT contain secrets (PAKASIR_API_KEY etc.). */
  detail?: Record<string, unknown>;
}

/**
 * Centralized admin audit log writer.
 *
 * AGENTS.md §2/§7: sensitive admin actions must write audit logs. Routing every
 * admin mutation through this helper keeps the shape consistent and prevents
 * drift. The `detail` payload is scrubbed of any obvious secret-shaped keys so a
 * careless caller cannot persist a secret into the audit trail.
 */
export async function writeAuditLog(
  client: AuditLogClient,
  input: AuditLogInput
): Promise<void> {
  await client.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      detail: scrub(input.detail) as Prisma.InputJsonValue,
    },
  });
}

const SECRET_KEY_FRAGMENTS = [
  "apikey",
  "api_key",
  "secret",
  "password",
  "token",
  "paasword",
] as const;

function scrub(
  detail?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!detail) return detail;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    const looksSecret = SECRET_KEY_FRAGMENTS.some((frag) =>
      key.toLowerCase().includes(frag)
    );
    out[key] = looksSecret ? "[redacted]" : value;
  }
  return out;
}
