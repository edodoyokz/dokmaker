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
  entryType: "download_debit" | "manual_adjustment_debit",
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

  if (wallet.currentBalance < amount) {
    throw new Error("Saldo tidak mencukupi");
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
        decrement: amount,
      },
    },
  });

  return entry;
}
