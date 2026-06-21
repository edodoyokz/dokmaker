import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/session", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/modules/wallet/service", () => ({
  creditWallet: vi.fn(),
  debitWallet: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => ({
  safeApiError: (_e: unknown, fallback: string) => fallback,
}));

import { POST } from "@/app/api/admin/users/[userId]/adjust/route";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import { creditWallet } from "@/modules/wallet/service";

const requireAdminMock = requireAdmin as unknown as ReturnType<typeof vi.fn>;
const prismaMock = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};
const creditWalletMock = creditWallet as unknown as ReturnType<typeof vi.fn>;

type AdminAuditLogMock = {
  adminAuditLog: { create: ReturnType<typeof vi.fn> };
};

function makeRequest(body: Record<string, unknown>, idempotencyKey?: string) {
  const headers = new Headers();
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  return new Request("http://localhost/api/admin/users/u-1/adjust", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("admin wallet adjustment idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u-1" });
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: AdminAuditLogMock) => unknown) =>
        cb({ adminAuditLog: { create: vi.fn().mockResolvedValue(undefined) } })
    );
    creditWalletMock.mockResolvedValue({ id: "ledger-1" });
  });

  it("requires Idempotency-Key header and rejects with 400 if missing", async () => {
    const req = makeRequest({ type: "credit", amount: 10000, reason: "test" });
    const res = await POST(req, {
      params: Promise.resolve({ userId: "u-1" }),
    });

    expect(res.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("builds ledger idempotency key from header value, not Date.now()", async () => {
    const req = makeRequest(
      { type: "credit", amount: 10000, reason: "test" },
      "adjust-req-001"
    );

    await POST(req, { params: Promise.resolve({ userId: "u-1" }) });

    expect(creditWalletMock).toHaveBeenCalledTimes(1);
    const ledgerKey = creditWalletMock.mock.calls[0][4] as string;
    expect(ledgerKey).toBe("admin-adjust:admin-1:u-1:adjust-req-001");
    expect(ledgerKey).not.toContain(Date.now().toString().slice(0, 4));
  });
});
