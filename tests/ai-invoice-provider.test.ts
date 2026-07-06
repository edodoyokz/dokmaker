import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

describe("Pollinations client", () => {
  beforeEach(() => {
    process.env.POLLINATIONS_API_KEY = "sk_test";
    process.env.POLLINATIONS_BASE_URL = "https://gen.pollinations.ai";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("sends vision analysis through chat completions with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Layout invoice dua kolom",
                colors: ["blue", "white"],
                sections: ["header", "items", "total"],
                detectedText: ["INVOICE"],
              }),
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock;
    const { analyzeReferenceImage } = await import("@/modules/ai-invoice/pollinations");

    const result = await analyzeReferenceImage({
      image: Buffer.from("image"),
      mimeType: "image/png",
    });

    expect(result.summary).toBe("Layout invoice dua kolom");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gen.pollinations.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer sk_test" }),
      })
    );
  });

  it("generates image and returns downloaded bytes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        headers: new Headers({ "content-type": "image/jpeg" }),
      });
    global.fetch = fetchMock;
    const { generateInvoiceImage } = await import("@/modules/ai-invoice/pollinations");

    const result = await generateInvoiceImage({ prompt: "invoice prompt" });

    expect(result.mimeType).toBe("image/jpeg");
    expect([...result.image]).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://gen.pollinations.ai/image/"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer sk_test" }) })
    );
  });
});
