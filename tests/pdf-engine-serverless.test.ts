import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Verifies the production (non-injected) PDF launcher path: in a real serverless
 * runtime, generateInvoicePdf must launch puppeteer-core with the
 * @sparticuz/chromium executable path (not stock Puppeteer/Chromium, which cannot
 * run on Vercel). We mock both packages and assert the executable path flows
 * through to puppeteer-core.launch, and that the returned buffer is a real PDF.
 */
describe("serverless pdf launcher", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("launches puppeteer-core with @sparticuz/chromium executable path", async () => {
    const launchSpy = vi.fn(async (opts: { executablePath?: string; args?: string[] }) => {
      // Confirm the serverless chromium path was passed through.
      expect(opts.executablePath).toBe("/tmp/chromium.br");
      expect(opts.args).toContain("--no-sandbox");
      return {
        newPage: async () => ({
          setContent: async () => {},
          pdf: async () => Buffer.from("%PDF-1.4\nmock serverless pdf"),
        }),
        close: async () => {},
      };
    });

    vi.doMock("puppeteer-core", () => ({
      default: { launch: launchSpy },
    }));
    vi.doMock("@sparticuz/chromium", () => ({
      default: {
        args: ["--no-sandbox", "--disable-gpu"],
        executablePath: async () => "/tmp/chromium.br",
      },
    }));

    const { generateInvoicePdf } = await import("@/lib/pdf/generator");

    const buf = await generateInvoicePdf({
      sender: { name: "DokMaker" },
      client: { name: "Client" },
      meta: {
        invoiceNumber: "INV-SL-1",
        issueDate: "2026-06-16",
        currency: "IDR",
      },
      items: [{ description: "Jasa", quantity: 1, unitPrice: 1000 }],
    });

    expect(launchSpy).toHaveBeenCalledTimes(1);
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("rethrows with a clear message when chromium executable cannot be resolved", async () => {
    vi.doMock("puppeteer-core", () => ({
      default: {
        launch: async () => {
          throw new Error("Could not find Chromium");
        },
      },
    }));
    vi.doMock("@sparticuz/chromium", () => ({
      default: {
        args: ["--no-sandbox"],
        executablePath: async () => "/tmp/chromium.br",
      },
    }));

    const { generateInvoicePdf } = await import("@/lib/pdf/generator");

    await expect(
      generateInvoicePdf({
        sender: { name: "A" },
        client: { name: "B" },
        meta: { invoiceNumber: "INV-1", issueDate: "2026-06-16", currency: "IDR" },
        items: [{ description: "x", quantity: 1, unitPrice: 1 }],
      })
    ).rejects.toThrow(/PDF engine/i);
  });
});
