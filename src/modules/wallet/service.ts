import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

/**
 * Get wallet for a user.
 */
export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    throw new Error("Wallet tidak ditemukan");
  }

  return wallet;
}

/**
 * Get wallet ledger entries for a user.
 */
export async function getLedgerEntries(userId: string, limit = 50) {
  return prisma.walletLedgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Credit wallet with idempotency check.
 * Must be called within a transaction.
 */
export async function creditWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  entryType: "topup_credit" | "refund_credit" | "manual_adjustment_credit",
  idempotencyKey: string,
  referenceType?: string,
  referenceId?: string,
  description?: string,
  actorType?: string,
  actorId?: string
) {
  // Check idempotency
  const existing = await tx.walletLedgerEntry.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    return existing; // Already processed
  }

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error("Jumlah kredit harus bilangan bulat lebih dari 0");
  }

  // Get wallet
  const wallet = await tx.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    throw new Error("Wallet tidak ditemukan");
  }

  // Create ledger entry and update balance atomically
  const entry = await tx.walletLedgerEntry.create({
    data: {
      walletId: wallet.id,
      userId,
      entryType,
      amount,
      currency: "IDR",
      status: "success",
      referenceType,
      referenceId,
      description,
      idempotencyKey,
      createdByActorType: actorType || "system",
      createdByActorId: actorId,
    },
  });

  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      currentBalance: {
        increment: amount,
      },
    },
  });

  return entry;
}

/**
 * Debit wallet with balance check and idempotency.
 * Must be called within a transaction.
 */
export async function debitWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  entryType: "download_debit" | "ai_generation_debit" | "manual_adjustment_debit",
  idempotencyKey: string,
  referenceType?: string,
  referenceId?: string,
  description?: string,
  actorType?: string,
  actorId?: string
) {
  // Check idempotency
  const existing = await tx.walletLedgerEntry.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    return existing; // Already processed
  }

  // Get wallet with lock
  const wallet = await tx.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    throw new Error("Wallet tidak ditemukan");
  }

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error("Jumlah debit harus bilangan bulat lebih dari 0");
  }

  // Create ledger entry and update balance atomically.
  //
  // The balance check + decrement MUST be a single conditional UPDATE so that
  // two concurrent debits for DIFFERENT idempotency keys (e.g. two distinct
  // invoice versions at once) cannot both pass a pre-read balance check and
  // overdraw the wallet. updateMany is atomic at the row level in Postgres and
  // returns count=0 when the WHERE clause (balance >= amount) no longer holds.
  const entry = await tx.walletLedgerEntry.create({
    data: {
      walletId: wallet.id,
      userId,
      entryType,
      amount,
      currency: "IDR",
      status: "success",
      referenceType,
      referenceId,
      description,
      idempotencyKey,
      createdByActorType: actorType || "system",
      createdByActorId: actorId,
    },
  });

  const result = await tx.wallet.updateMany({
    where: { id: wallet.id, currentBalance: { gte: amount } },
    data: {
      currentBalance: {
        decrement: amount,
      },
    },
  });

  if (result.count === 0) {
    // Balance was insufficient at commit time. The ledger entry above was
    // created inside this transaction, which will be rolled back by the caller's
    // $transaction wrapper when we throw — leaving no partial mutation.
    throw new Error("Saldo tidak mencukupi");
  }

  return entry;
}
