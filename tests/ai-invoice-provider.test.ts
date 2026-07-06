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

  it("sends vision analysis through chat completions and returns enriched fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Layout invoice dua kolom",
                documentType: "invoice",
                colors: ["blue", "white"],
                sections: ["header", "items", "total"],
                detectedText: ["INVOICE"],
                fields: [
                  { label: "Perusahaan", value: "PT Contoh" },
                  { label: "No Invoice", value: "INV-001" },
                ],
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
    expect(result.documentType).toBe("invoice");
    expect(result.fields).toEqual([
      { label: "Perusahaan", value: "PT Contoh" },
      { label: "No Invoice", value: "INV-001" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gen.pollinations.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer sk_test" }),
      })
    );
  });

  it("posts multipart to /v1/images/edits when reference image provided (img2img)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ b64_json: Buffer.from([1, 2, 3]).toString("base64") }],
      }),
      headers: new Headers({ "x-request-id": "req-1" }),
    });
    global.fetch = fetchMock;
    const { generateInvoiceImage } = await import("@/modules/ai-invoice/pollinations");

    const result = await generateInvoiceImage({
      prompt: "ubah warna jadi biru",
      referenceImage: { body: Buffer.from([10, 20]), mimeType: "image/png" },
    });

    expect(result.mimeType).toBe("image/png");
    expect([...result.image]).toEqual([1, 2, 3]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://gen.pollinations.ai/v1/images/edits");
    expect(init).toMatchObject({ method: "POST" });
    expect(init.headers).toMatchObject({ Authorization: "Bearer sk_test" });
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.has("image")).toBe(true);
    expect(form.get("prompt")).toBe("ubah warna jadi biru");
    expect(form.get("model")).toBe("gptimage-large");
  });

  it("falls back to GET /image/{prompt} when no reference image (text2image)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([4, 5]).buffer,
      headers: new Headers({ "content-type": "image/png" }),
    });
    global.fetch = fetchMock;
    const { generateInvoiceImage } = await import("@/modules/ai-invoice/pollinations");

    const result = await generateInvoiceImage({ prompt: "invoice prompt" });

    expect(result.mimeType).toBe("image/png");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("https://gen.pollinations.ai/image/");
    expect(init.method).toBeUndefined();
    expect(init.body).toBeUndefined();
  });
});
