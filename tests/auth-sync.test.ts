import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, userFindUniqueMock, txUserCreateMock, txWalletCreateMock } =
  vi.hoisted(() => ({
    getUserMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    txUserCreateMock: vi.fn(),
    txWalletCreateMock: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: getUserMock } }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    auth: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock,
    },
    $transaction: vi.fn().mockImplementation(async (callback: CallableFunction) =>
      callback({
        user: { create: txUserCreateMock },
        wallet: { create: txWalletCreateMock },
      })
    ),
  },
}));

import { requireUser } from "@/modules/auth/session";

const sampleUser = {
  id: "supabase-user-1",
  email: "newbie@example.test",
  fullName: "Newbie",
  role: "user" as const,
  authProvider: "supabase",
  authProviderUserId: "supabase-user-1",
};

describe("syncLocalUser (via requireUser) race-condition hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "supabase-user-1",
          email: "newbie@example.test",
          user_metadata: { full_name: "Newbie" },
        },
      },
      error: null,
    });
  });

  it("creates user and wallet when user does not exist", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    txUserCreateMock.mockResolvedValue(sampleUser);
    txWalletCreateMock.mockResolvedValue({ id: "wallet-1", userId: "supabase-user-1" });

    const user = await requireUser();

    expect(user.id).toBe("supabase-user-1");
    expect(txUserCreateMock).toHaveBeenCalledTimes(1);
    expect(txWalletCreateMock).toHaveBeenCalledTimes(1);
    expect(txWalletCreateMock).toHaveBeenCalledWith({
      data: { userId: "supabase-user-1" },
    });
  });

  it("recovers from concurrent-create P2002 violation by re-reading existing user", async () => {
    // First findUnique returns null (race: both see no user)
    userFindUniqueMock.mockResolvedValueOnce(null);
    // Transaction: user.create fails with P2002 (the loser)
    const p2002Error = Object.assign(new Error("Unique constraint failed on user"), {
      code: "P2002",
    });
    txUserCreateMock.mockRejectedValue(p2002Error);
    // Second findUnique returns the row created by the winner
    userFindUniqueMock.mockResolvedValueOnce(sampleUser);

    const user = await requireUser();

    expect(user.id).toBe("supabase-user-1");
    expect(userFindUniqueMock).toHaveBeenCalledTimes(2);
    // Wallet should NOT be created in the recovery path (winner already did)
    expect(txWalletCreateMock).not.toHaveBeenCalled();
  });

  it("re-throws non-unique-constraint errors from user.create", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    txUserCreateMock.mockRejectedValue(new Error("DB connection lost"));

    await expect(requireUser()).rejects.toThrow(/DB connection lost/i);
  });

  it("returns existing user without creating wallet or entering transaction", async () => {
    userFindUniqueMock.mockResolvedValue(sampleUser);

    const user = await requireUser();

    expect(user.id).toBe("supabase-user-1");
    expect(txUserCreateMock).not.toHaveBeenCalled();
    expect(txWalletCreateMock).not.toHaveBeenCalled();
  });
});
