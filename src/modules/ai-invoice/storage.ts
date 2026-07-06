import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

export interface StoredImage {
  body: Buffer;
  contentType: string;
}

export function buildAiReferenceImageStorageKey(input: {
  userId: string;
  sessionId: string;
  extension: string;
}): string {
  return `ai-invoice/reference/${input.userId}/${input.sessionId}.${input.extension}`;
}

export function buildAiOutputImageStorageKey(input: {
  userId: string;
  sessionId: string;
  outputId: string;
  extension: string;
}): string {
  return `ai-invoice/output/${input.userId}/${input.sessionId}/${input.outputId}.${input.extension}`;
}

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

function resolveClient(): { bucket: string; client: S3Client } {
  const bucket = process.env.R2_BUCKET_NAME;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      process.env.NODE_ENV === "production"
        ? "R2 storage is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME required)"
        : "R2 storage is not configured"
    );
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

export const aiImageStorage = {
  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { bucket, client } = resolveClient();
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
    );
  },

  async get(key: string): Promise<StoredImage> {
    const { bucket, client } = resolveClient();
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error("Gambar tidak ditemukan");
    const body = response.Body as Readable & { transformToByteArray?: () => Promise<Uint8Array> };
    const bytes = (await body.transformToByteArray?.()) ?? (await streamToBuffer(body));
    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType || "application/octet-stream",
    };
  },
};
