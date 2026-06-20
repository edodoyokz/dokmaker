import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const __sent = vi.fn();

// AWS SDK commands and client support `new` construction.
vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = __sent;
  }
  class MockPutObjectCommand {
    constructor(public input: unknown) {}
  }
  class MockGetObjectCommand {
    constructor(public input: unknown) {}
  }
  return {
    S3Client: MockS3Client as unknown as typeof import("@aws-sdk/client-s3").S3Client,
    PutObjectCommand: MockPutObjectCommand as unknown as typeof import("@aws-sdk/client-s3").PutObjectCommand,
    GetObjectCommand: MockGetObjectCommand as unknown as typeof import("@aws-sdk/client-s3").GetObjectCommand,
  };
});

import { pdfStorage, buildInvoiceFinalPdfStorageKey } from "@/modules/downloads/pdf-storage";

describe("buildInvoiceFinalPdfStorageKey", () => {
  it("builds deterministic key with hash segment when contentHash present", () => {
    const key = buildInvoiceFinalPdfStorageKey({
      userId: "u1",
      invoiceId: "i1",
      versionId: "v1",
      contentHash:
        "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    });
    expect(key).toBe("invoice-finals/u1/i1/v1-abcdef1234567890.pdf");
  });

  it("omits hash segment when contentHash absent", () => {
    const key = buildInvoiceFinalPdfStorageKey({
      userId: "u1",
      invoiceId: "i1",
      versionId: "v1",
    });
    expect(key).toBe("invoice-finals/u1/i1/v1.pdf");
  });
});

describe("pdfStorage R2 backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("R2_ACCOUNT_ID", "test-account");
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
    vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("put sends PutObjectCommand with bucket, key, and pdf body", async () => {
    const pdf = Buffer.from("%PDF-test");
    await pdfStorage.put("invoice-finals/u1/i1/v1.pdf", pdf);

    expect(__sent).toHaveBeenCalledTimes(1);
    const sentCommand = __sent.mock.calls[0][0];
    expect(sentCommand.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "invoice-finals/u1/i1/v1.pdf",
      Body: pdf,
      ContentType: "application/pdf",
    });
  });

  it("get sends GetObjectCommand and returns the body as Buffer", async () => {
    const pdf = Buffer.from("%PDF-stored");
    __sent.mockResolvedValueOnce({
      Body: {
        transformToByteArray: async () => new Uint8Array(pdf),
      },
    });

    const result = await pdfStorage.get("invoice-finals/u1/i1/v1.pdf");

    expect(__sent).toHaveBeenCalledTimes(1);
    const sentCommand = __sent.mock.calls[0][0];
    expect(sentCommand.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "invoice-finals/u1/i1/v1.pdf",
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("%PDF-stored");
  });

  it("get throws a clear error when the object does not exist", async () => {
    const NoSuchKey = class extends Error {
      override name = "NoSuchKey";
    };
    __sent.mockRejectedValueOnce(new NoSuchKey("not found"));

    await expect(pdfStorage.get("missing")).rejects.toThrow(
      /final pdf artifact/i
    );
  });

  it("throws in production when R2 env vars are missing", async () => {
    __sent.mockResolvedValue(undefined);
    vi.stubEnv("R2_BUCKET_NAME", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(pdfStorage.put("k", Buffer.from("x"))).rejects.toThrow(
      /r2.*not configured/i
    );
  });
});
