import { afterEach, describe, expect, it, vi } from "vitest";

describe("AI invoice config", () => {
  const originalEnv = process.env.AI_INVOICE_GENERATION_PRICE_IDR;

  afterEach(() => {
    process.env.AI_INVOICE_GENERATION_PRICE_IDR = originalEnv;
    vi.resetModules();
  });

  it("uses server env price when valid", async () => {
    process.env.AI_INVOICE_GENERATION_PRICE_IDR = "15000";
    const { getAiInvoiceGenerationPrice } = await import(
      "@/modules/ai-invoice/constants"
    );
    expect(getAiInvoiceGenerationPrice()).toBe(15000);
  });

  it("falls back to default price when env is missing", async () => {
    delete process.env.AI_INVOICE_GENERATION_PRICE_IDR;
    const { getAiInvoiceGenerationPrice } = await import(
      "@/modules/ai-invoice/constants"
    );
    expect(getAiInvoiceGenerationPrice()).toBe(10000);
  });
});
