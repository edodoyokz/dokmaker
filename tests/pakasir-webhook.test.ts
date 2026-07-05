import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    paymentTransaction: {
      findFirst: vi.fn(),
    },
    paymentWebhookEvent: {
      findUnique: vi.fn(),
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
  paymentWebhookEvent: {
    findUnique: ReturnType<typeof vi.fn>;
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
    delete process.env.PAKASIR_WEBHOOK_SECRET;
    // By default, no prior webhook event exists.
    prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue(null);
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
          transaction: {
            amount: 50000,
            order_id: "ORDER-2",
            project: "dokmaker-test",
            status: "pending",
            payment_method: "qris",
          },
        }),
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
        // Official Pakasir Transaction Detail response shape per docs
        json: async () => ({
          transaction: {
            amount: 50000,
            order_id: "ORDER-5",
            project: "dokmaker-test",
            status: "completed",
            payment_method: "qris",
            completed_at: "2026-07-05T08:07:02.819+07:00",
          },
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
        providerReference: "ORDER-5",
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

  // ── P1-2: intake-level dedup + optional HMAC signature ────────────────
  describe("intake-level event dedup", () => {
    it("returns ignored_duplicate when a processed event with the same id exists", async () => {
      prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: "evt-1",
        status: "processed",
      });

      const result = await handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-DUP",
        amount: 50000,
        providerEventId: "EVT-1",
      });

      expect(result).toEqual({ status: "ignored_duplicate" });
      // Never reaches the DB credit path or the upstream verify call.
      expect(prismaMock.paymentTransaction.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(creditWalletMock).not.toHaveBeenCalled();
    });

    it("dedups by order_id when providerEventId is omitted", async () => {
      prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: "evt-order",
        status: "processed",
      });

      const result = await handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-FALLBACK",
        amount: 50000,
      });

      expect(result).toEqual({ status: "ignored_duplicate" });
      expect(prismaMock.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerEventId: {
            provider: "pakasir",
            providerEventId: "ORDER-FALLBACK",
          },
        },
      });
    });

    it("does not dedup on a non-processed (e.g. failed) prior event", async () => {
      prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: "evt-failed",
        status: "failed",
      });
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

      // Should proceed past dedup and fail at verification, not be ignored.
      await expect(
        handlePakasirWebhook({
          project: "dokmaker-test",
          order_id: "ORDER-RETRY",
          amount: 50000,
        })
      ).rejects.toThrow(/verifikasi transaksi/i);
    });
  });

  describe("optional HMAC signature verification", () => {
    it("rejects a webhook missing a signature when a secret is configured", async () => {
      process.env.PAKASIR_WEBHOOK_SECRET = "shared-secret";
      await expect(
        handlePakasirWebhook({
          project: "dokmaker-test",
          order_id: "ORDER-NOSIG",
          amount: 50000,
        })
      ).rejects.toThrow(/tanda tangan webhook hilang/i);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("rejects a webhook with an invalid signature", async () => {
      process.env.PAKASIR_WEBHOOK_SECRET = "shared-secret";
      await expect(
        handlePakasirWebhook({
          project: "dokmaker-test",
          order_id: "ORDER-BADSIG",
          amount: 50000,
          signature: "deadbeef",
        })
      ).rejects.toThrow(/tanda tangan webhook tidak valid/i);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("accepts a webhook with a valid signature", async () => {
      process.env.PAKASIR_WEBHOOK_SECRET = "shared-secret";
      // Build the expected signature the same way the handler does.
      const { createHmac } = await import("node:crypto");
      const signature = createHmac("sha256", "shared-secret")
        .update("ORDER-GOODSIG:50000")
        .digest("hex");

      prismaMock.paymentTransaction.findFirst.mockResolvedValue({
        id: "payment-9",
        userId: "user-9",
        amount: 50000,
        status: "success",
      } satisfies PaymentRecord);

      const result = await handlePakasirWebhook({
        project: "dokmaker-test",
        order_id: "ORDER-GOODSIG",
        amount: 50000,
        signature,
      });

      // Signature valid → proceeds past verification; payment already success.
      expect(result).toEqual({ status: "already_processed" });
    });
  });
});
