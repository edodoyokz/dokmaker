import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    paymentTransaction: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

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

type PaymentRecord = {
  id: string;
  userId: string;
  amount: number;
  status: string;
};

type TransactionClientMock = {
  paymentTransaction: {
    update: ReturnType<typeof vi.fn>;
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
      })
    ).rejects.toThrow(/amount/i);
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
        json: async () => ({ status: "pending" }),
      })
    );

    await expect(
      handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-2",
        amount: 50000,
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

    const updateMock = vi.fn().mockResolvedValue(undefined);
    const createMock = vi.fn().mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: TransactionClientMock) => unknown) =>
        callback({
          paymentTransaction: {
            update: updateMock,
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
          reference: "REF-123",
        }),
      })
    );

    const result = await handlePakasirWebhook({
      project: "dokmaker-test",
      order_id: "ORDER-5",
      amount: 50000,
    });

    expect(result).toEqual({ status: "credited" });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "payment-2" },
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
});
