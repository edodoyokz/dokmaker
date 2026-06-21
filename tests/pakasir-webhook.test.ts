import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    paymentTransaction: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

type PaymentRecord = {
  id: string;
  userId: string;
  amount: number;
  status: string;
};

vi.mock("@/lib/logger", () => ({
  logger: {
    webhook: vi.fn(),
    warn: vi.fn(),
    payment: vi.fn(),
  },
}));

vi.mock("@/modules/wallet/service", () => ({
  creditWallet: vi.fn(),
}));

import { handlePakasirWebhook } from "@/modules/payments/pakasir";
import { prisma } from "@/lib/db/prisma";
import { creditWallet } from "@/modules/wallet/service";

type TransactionClientMock = {
  paymentTransaction: {
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  paymentWebhookEvent: {
    create: ReturnType<typeof vi.fn>;
  };
};

const prismaMock = prisma as unknown as {
  paymentTransaction: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};
const creditWalletMock = creditWallet as unknown as ReturnType<typeof vi.fn>;

describe("handlePakasirWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.PAKASIR_PROJECT_SLUG = "dokmaker-test";
    process.env.PAKASIR_API_KEY = "secret-key";
    process.env.PAKASIR_BASE_URL = "https://app.pakasir.com";
  });

  it("rejects webhook when project slug does not match", async () => {
    await expect(
      handlePakasirWebhook({
        project: "wrong-project",
        order_id: "ORDER-1",
        amount: 50000,
      })
    ).rejects.toThrow(/project slug/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects webhook when payment transaction cannot be found", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue(null);

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-6",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/payment transaction/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("rejects webhook when payment amount does not match local record", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-1",
      userId: "user-1",
      amount: 100000,
      status: "created",
    } satisfies PaymentRecord);

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-1",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/amount/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("rejects webhook body when status field is missing", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-missing-status",
      userId: "user-1",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-missing-status",
        amount: 50000,
      })
    ).rejects.toThrow(/completed/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("rejects webhook body when status is not completed", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-pending-status",
      userId: "user-1",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-pending-status",
        amount: 50000,
        status: "pending",
      })
    ).rejects.toThrow(/completed/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("rejects when pakasir detail project does not match webhook project", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-project-mismatch",
      userId: "user-1",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "completed",
          project: "wrong-project",
          order_id: "ORDER-project-mismatch",
          amount: 50000,
          reference: "REF-PM",
        }),
      })
    );

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-project-mismatch",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/project/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("rejects when pakasir detail order_id does not match local order id", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-order-mismatch",
      userId: "user-1",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "completed",
          project: "dokmaker-test",
          order_id: "DIFFERENT-ORDER",
          amount: 50000,
          reference: "REF-OM",
        }),
      })
    );

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-order-mismatch",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/order id/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("rejects when pakasir detail amount does not match local payment amount", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-amount-mismatch",
      userId: "user-1",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "completed",
          project: "dokmaker-test",
          order_id: "ORDER-amount-mismatch",
          amount: 500000,
          reference: "REF-AM",
        }),
      })
    );

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-amount-mismatch",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/amount/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("rejects webhook when pakasir API key is not configured", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-0",
      userId: "user-0",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    delete process.env.PAKASIR_API_KEY;

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-0",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/api key/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("does not credit wallet when pakasir detail status is not completed", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-1",
      userId: "user-1",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "pending",
          project: "dokmaker-test",
          order_id: "ORDER-2",
          amount: 50000,
        }),
      })
    );

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-2",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/completed/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("does not mark payment success when pakasir detail request fails", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-1",
      userId: "user-1",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "upstream failure" }),
      })
    );

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-3",
        amount: 50000,
        status: "completed",
      })
    ).rejects.toThrow(/verifikasi transaksi/i);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("returns already_processed without creating duplicate ledger entries", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-1",
      userId: "user-1",
      amount: 50000,
      status: "success",
    } satisfies PaymentRecord);

    const result = await handlePakasirWebhook({
      project: "dokmaker-test",
      order_id: "ORDER-4",
      amount: 50000,
      status: "completed",
    });

    expect(result).toEqual({ status: "already_processed" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(creditWalletMock).not.toHaveBeenCalled();
  });

  it("records payment success and credits wallet exactly once when detail is completed", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-2",
      userId: "user-2",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: TransactionClientMock) => unknown) =>
        callback({
          paymentTransaction: {
            update: vi.fn(),
            updateMany: updateManyMock,
          },
          paymentWebhookEvent: {
            create: createMock,
          },
        })
    );

    creditWalletMock.mockResolvedValue({ id: "ledger-1" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "completed",
          project: "dokmaker-test",
          order_id: "ORDER-5",
          amount: 50000,
          reference: "REF-123",
        }),
      })
    );

    const result = await handlePakasirWebhook({
      project: "dokmaker-test",
      order_id: "ORDER-5",
      amount: 50000,
      status: "completed",
    });

    expect(result).toEqual({ status: "credited" });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "payment-2", status: { not: "success" } },
      data: expect.objectContaining({
        status: "success",
        providerReference: "REF-123",
      }),
    });
    expect(creditWalletMock).toHaveBeenCalledTimes(1);
    expect(creditWalletMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-2",
      50000,
      "topup_credit",
      "pakasir:ORDER-5",
      "payment_transaction",
      "payment-2",
      expect.stringContaining("ORDER-5"),
      "webhook",
      "pakasir"
    );
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("returns already_processed when transactional claim loses the race (count 0)", async () => {
    // Pre-check sees status 'created' so we enter the transaction.
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-race",
      userId: "user-race",
      amount: 50000,
      status: "created",
    } satisfies PaymentRecord);

    // Inside transaction, the conditional claim returns count 0, meaning
    // a concurrent worker already flipped payment to success.
    const updateManyMock = vi.fn().mockResolvedValue({ count: 0 });
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: TransactionClientMock) => unknown) =>
        callback({
          paymentTransaction: {
            update: vi.fn(),
            updateMany: updateManyMock,
          },
          paymentWebhookEvent: {
            create: createMock,
          },
        })
    );

    creditWalletMock.mockResolvedValue({ id: "ledger-existing" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "completed",
          project: "dokmaker-test",
          order_id: "ORDER-race",
          amount: 50000,
          reference: "REF-RACE",
        }),
      })
    );

    const result = await handlePakasirWebhook({
      project: "dokmaker-test",
      order_id: "ORDER-race",
      amount: 50000,
      status: "completed",
    });

    expect(result).toEqual({ status: "already_processed" });
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    // Loser of the race must NOT credit wallet or create webhook event.
    expect(creditWalletMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });
});
