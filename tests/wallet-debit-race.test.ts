import { describe, it, expect } from "vitest";
import { debitWallet } from "@/modules/wallet/service";

/**
 * Mocks the minimal Prisma TransactionClient surface that debitWallet uses, with
 * an in-memory wallet whose balance is mutated exactly the way the real
 * conditional updateMany does: the decrement only applies when
 * currentBalance >= amount, and updateMany returns { count: 1|0 } accordingly.
 *
 * This lets us prove the negative-balance race fix (P1-1) without a database:
 * a pre-read balance check followed by a non-conditional update could overdraw,
 * but the conditional updateMany cannot.
 */
function makeTx(initialBalance: number) {
  const wallet = { id: "wallet-1", userId: "user-1", currentBalance: initialBalance };
  const seenIdempotencyKeys = new Set<string>();

  const tx = {
    walletLedgerEntry: {
      findUnique: async ({ where: { idempotencyKey } }: { where: { idempotencyKey: string } }) =>
        seenIdempotencyKeys.has(idempotencyKey)
          ? { id: "dup", idempotencyKey }
          : null,
      create: async ({ data }: { data: { idempotencyKey: string } }) => {
        seenIdempotencyKeys.add(data.idempotencyKey);
        return { id: "entry-" + data.idempotencyKey, ...data };
      },
    },
    wallet: {
      findUnique: async () => ({ ...wallet }),
      // Conditional atomic update — mirrors Postgres statement atomicity.
      updateMany: async ({
        where: cond,
        data,
      }: {
        where: { id: string; currentBalance?: { gte?: number } };
        data: { currentBalance: { decrement: number } };
      }) => {
        const meetsBalance =
          cond.currentBalance?.gte === undefined ||
          wallet.currentBalance >= cond.currentBalance.gte;
        const matchesId = cond.id === wallet.id;
        if (matchesId && meetsBalance) {
          wallet.currentBalance -= data.currentBalance.decrement;
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
  };
  return { tx, readBalance: () => wallet.currentBalance };
}

describe("debitWallet negative-balance race prevention", () => {
  it("rejects a debit when balance is insufficient and does not mutate balance", async () => {
    const { tx, readBalance } = makeTx(5_000); // less than the 10_000 download price
    await expect(
      debitWallet(tx as never, "user-1", 10_000, "download_debit", "k1")
    ).rejects.toThrow(/Saldo tidak mencukupi/);
    expect(readBalance()).toBe(5_000); // untouched
  });

  it("allows a debit when balance exactly equals the amount", async () => {
    const { tx, readBalance } = makeTx(10_000);
    await debitWallet(tx as never, "user-1", 10_000, "download_debit", "k2");
    expect(readBalance()).toBe(0);
  });

  it("two concurrent debits that together exceed balance: only one succeeds", async () => {
    // Balance covers exactly ONE 10_000 download. Two DIFFERENT versions race.
    const { tx, readBalance } = makeTx(10_000);
    const p1 = debitWallet(tx as never, "user-1", 10_000, "download_debit", "a:v1");
    const p2 = debitWallet(tx as never, "user-1", 10_000, "download_debit", "a:v2");
    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter(
      (r) => r.status === "rejected"
    ).length;
    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);
    // Balance never goes negative.
    expect(readBalance()).toBeGreaterThanOrEqual(0);
    expect(readBalance()).toBe(0);
  });

  it("rejects non-positive debit amounts", async () => {
    const { tx, readBalance } = makeTx(100_000);
    await expect(
      debitWallet(tx as never, "user-1", 0, "download_debit", "k3")
    ).rejects.toThrow(/lebih dari 0/i);
    await expect(
      debitWallet(tx as never, "user-1", -5, "download_debit", "k4")
    ).rejects.toThrow(/lebih dari 0/i);
    expect(readBalance()).toBe(100_000);
  });

  it("idempotency: same key debits only once", async () => {
    const { tx, readBalance } = makeTx(100_000);
    await debitWallet(tx as never, "user-1", 10_000, "download_debit", "dup-key");
    await debitWallet(tx as never, "user-1", 10_000, "download_debit", "dup-key");
    expect(readBalance()).toBe(90_000); // only one decrement
  });
});
