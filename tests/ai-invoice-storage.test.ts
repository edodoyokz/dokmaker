import { describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn((input) => ({ type: "put", input })),
  GetObjectCommand: vi.fn((input) => ({ type: "get", input })),
}));

import {
  buildAiOutputImageStorageKey,
  buildAiReferenceImageStorageKey,
} from "@/modules/ai-invoice/storage";

describe("AI invoice image storage keys", () => {
  it("builds private reference image key", () => {
    expect(
      buildAiReferenceImageStorageKey({
        userId: "user-1",
        sessionId: "session-1",
        extension: "png",
      })
    ).toBe("ai-invoice/reference/user-1/session-1.png");
  });

  it("builds private output image key", () => {
    expect(
      buildAiOutputImageStorageKey({
        userId: "user-1",
        sessionId: "session-1",
        outputId: "output-1",
        extension: "jpg",
      })
    ).toBe("ai-invoice/output/user-1/session-1/output-1.jpg");
  });
});
