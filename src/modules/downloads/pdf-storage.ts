/**
 * PDF artifact storage for paid invoice versions.
 *
 * Backed by Cloudflare R2 (S3-compatible) in production.
 * Uses a mockable S3Client interface — tests mock @aws-sdk/client-s3.
 *
 * Final PDFs must NEVER be served via public permanent URLs.
 * They are only streamed through authenticated backend routes.
 * No public ACL is ever set on stored objects.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

export interface PdfStorage {
  put(key: string, pdf: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

/**
 * Build the storage key for a paid invoice version's final PDF artifact.
 * Format: invoice-finals/{userId}/{invoiceId}/{versionId}[-{hashFirst16}].pdf
 */
export function buildInvoiceFinalPdfStorageKey(input: {
  userId: string;
  invoiceId: string;
  versionId: string;
  contentHash?: string | null;
}): string {
  const hashSegment = input.contentHash
    ? `-${input.contentHash.slice(0, 16)}`
    : "";
  return `invoice-finals/${input.userId}/${input.invoiceId}/${input.versionId}${hashSegment}.pdf`;
}

// Lazily instantiate client so test env-variable stubs are visible at call time.
let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

function resolveClient(): { bucket: string; client: S3Client } {
  const bucket = process.env.R2_BUCKET_NAME;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "R2 storage is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME required)"
      );
    }
    throw new Error("R2 storage is not configured");
  }

  if (!cachedClient || cachedBucket !== bucket) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    cachedBucket = bucket;
  }
  return { bucket, client: cachedClient };
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const pdfStorage: PdfStorage = {
  async put(key, pdf) {
    const { bucket, client } = resolveClient();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdf,
        ContentType: "application/pdf",
        // Final PDFs are private — never set public ACL.
      })
    );
  },

  async get(key): Promise<Buffer> {
    const { bucket, client } = resolveClient();
    let response;
    try {
      response = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
    } catch (err: unknown) {
      const name = (err as Error)?.name;
      if (name === "NoSuchKey" || name === "NotFound") {
        throw new Error("Final PDF artifact tidak ditemukan");
      }
      throw err;
    }

    if (!response.Body) {
      throw new Error("Final PDF artifact tidak ditemukan");
    }

    // @aws-sdk/client-s3 v3 returns a SdkStream
    const body = response.Body as Readable & {
      transformToByteArray?: () => Promise<Uint8Array>;
    };
    const bytes =
      (await body.transformToByteArray?.()) ??
      (await streamToBuffer(body));
    return Buffer.from(bytes);
  },
};
