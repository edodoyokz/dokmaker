import { describe, it, expect, vi } from "vitest";
import { writeAuditLog } from "@/modules/audit";

/** Minimal mock client matching the AuditLogClient surface. */
function makeClient() {
  const created: unknown[] = [];
  const client = {
    adminAuditLog: {
      create: vi.fn(async (args: { data: unknown }) => {
        created.push(args.data);
        return args.data;
      }),
    },
  };
  return { client, created };
}

describe("writeAuditLog", () => {
  it("writes an audit record with the provided shape", async () => {
    const { client, created } = makeClient();
    await writeAuditLog(client, {
      adminUserId: "admin-1",
      action: "create_template",
      targetType: "invoice_template",
      targetId: "tpl-1",
      detail: { name: "Standard" },
    });

    expect(client.adminAuditLog.create).toHaveBeenCalledTimes(1);
    expect(created[0]).toMatchObject({
      adminUserId: "admin-1",
      action: "create_template",
      targetType: "invoice_template",
      targetId: "tpl-1",
    });
  });

  it("scrubs secret-shaped detail keys before persisting (secrets-leak guard)", async () => {
    const { client, created } = makeClient();
    await writeAuditLog(client, {
      adminUserId: "admin-1",
      action: "manual_adjustment_credit",
      targetType: "wallet",
      targetId: "user-1",
      detail: {
        amount: 50000,
        reason: "comp",
        api_key: "super-secret-value",
        pakasirToken: "should-not-leak",
        password: "hunter2",
      },
    });

    const persisted = created[0] as { detail: Record<string, unknown> };
    expect(persisted.detail.api_key).toBe("[redacted]");
    expect(persisted.detail.pakasirToken).toBe("[redacted]");
    expect(persisted.detail.password).toBe("[redacted]");
    // Non-secret values are preserved.
    expect(persisted.detail.amount).toBe(50000);
    expect(persisted.detail.reason).toBe("comp");
    // The raw secret must never appear in the persisted payload.
    const serialized = JSON.stringify(persisted);
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("hunter2");
  });

  it("omits detail entirely when not provided", async () => {
    const { client, created } = makeClient();
    await writeAuditLog(client, {
      adminUserId: "admin-1",
      action: "a",
      targetType: "b",
      targetId: "c",
    });
    const persisted = created[0] as { detail?: unknown };
    expect(persisted.detail).toBeUndefined();
  });
});
