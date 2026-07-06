# AI Reference Invoice Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, wallet-paid AI invoice image generator where users upload a reference invoice image, run limited free analysis, pay per Pollinations.ai generation/revision, and download the generated image.

**Architecture:** Add a small `ai-invoice` module beside existing finance modules. Keep all wallet mutations server-side through existing wallet services, store uploaded/generated images in private R2/S3 storage, and expose authenticated Next.js API routes plus one mobile-first app page. Use Pollinations.ai via native `fetch`; no new SDK dependency.

**Tech Stack:** Next.js route handlers, React client component, TypeScript, Prisma/PostgreSQL, existing wallet ledger, existing S3-compatible storage dependency, Pollinations.ai HTTP API, Vitest.

## Global Constraints

- Never mutate wallet balance from client-side code.
- Wallet ledger remains append-only.
- Wallet debit/refund and output state updates happen server-side.
- Duplicate generate requests with the same idempotency key must not debit twice.
- Reference and generated images are private; no permanent public URLs.
- Pollinations API key is server-only and never logged.
- Analysis is free but limited; generate/revision costs server-configured IDR price.
- No new dependency unless native `fetch`, Prisma, Zod, or existing AWS SDK cannot do the job.
- User can only access their own sessions, outputs, and downloads.

---

## File Structure

### Create

- `src/modules/ai-invoice/constants.ts` — file limits, analysis limit, price parsing, provider defaults.
- `src/modules/ai-invoice/storage.ts` — private R2/S3 put/get helpers for reference/output images.
- `src/modules/ai-invoice/pollinations.ts` — Pollinations analysis and image-generation HTTP client.
- `src/modules/ai-invoice/service.ts` — session creation, analysis, paid generation, refund-on-failure, download lookup.
- `src/components/ai-invoice/ai-invoice-generator.tsx` — mobile-first upload/analyze/generate/download UI.
- `src/app/app/ai-invoice-generator/page.tsx` — protected app page.
- `src/app/api/ai-invoice/sessions/route.ts` — create session.
- `src/app/api/ai-invoice/sessions/[id]/route.ts` — read session.
- `src/app/api/ai-invoice/sessions/[id]/analyze/route.ts` — run free analysis.
- `src/app/api/ai-invoice/sessions/[id]/generate/route.ts` — paid generation.
- `src/app/api/ai-invoice/outputs/[id]/download/route.ts` — authenticated output download.
- `tests/ai-invoice-service.test.ts` — finance/idempotency/authz/refund unit tests.
- `tests/ai-invoice-provider.test.ts` — Pollinations request-shape tests.
- `tests/ai-invoice-storage.test.ts` — storage key and content-type tests.

### Modify

- `prisma/schema.prisma` — add AI session/output enums/models and `ai_generation_debit` ledger enum value.
- `src/modules/wallet/service.ts` — allow `ai_generation_debit` in `debitWallet`.
- `src/lib/errors.ts` — allowlist user-actionable AI generator errors.
- `src/modules/pricing/constants.ts` — export AI generation price helper or delegate to new constants.
- `src/app/app/layout.tsx` — add desktop/mobile-bottom AI Generator nav entry.
- `src/components/layout/mobile-nav.tsx` — add sheet nav AI Generator entry.
- `.env.example` — add Pollinations and AI invoice config names only.

---

### Task 1: Prisma schema and config constants

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/modules/ai-invoice/constants.ts`
- Modify: `.env.example`
- Test: `tests/ai-invoice-service.test.ts` starts with price/config tests

**Interfaces:**
- Produces: Prisma models `AiGenerationSession`, `AiGenerationOutput`.
- Produces: `getAiInvoiceGenerationPrice(): number`.
- Produces: constants `AI_INVOICE_MAX_IMAGE_BYTES`, `AI_INVOICE_ALLOWED_MIME_TYPES`, `AI_INVOICE_FREE_ANALYSES_PER_DAY`.

- [ ] **Step 1: Add failing config tests**

Append to new `tests/ai-invoice-service.test.ts`:

```ts
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
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- tests/ai-invoice-service.test.ts
```

Expected: FAIL because `@/modules/ai-invoice/constants` does not exist.

- [ ] **Step 3: Update Prisma schema**

In `prisma/schema.prisma`, modify enum `WalletLedgerEntryType`:

```prisma
enum WalletLedgerEntryType {
  topup_credit
  download_debit
  ai_generation_debit
  refund_credit
  manual_adjustment_credit
  manual_adjustment_debit
}
```

Add relations to `User`:

```prisma
  aiGenerationSessions AiGenerationSession[]
  aiGenerationOutputs  AiGenerationOutput[]
```

Add these enums and models after `DownloadLog`:

```prisma
enum AiGenerationSessionStatus {
  uploaded
  analyzed
  ready_to_generate
  generating
  completed
  failed
}

enum AiGenerationOutputStatus {
  pending
  generating
  success
  failed
  refunded
}

model AiGenerationSession {
  id                         String                    @id @default(cuid())
  userId                     String                    @map("user_id")
  status                     AiGenerationSessionStatus @default(uploaded)
  referenceImageStorageKey    String                    @map("reference_image_storage_key")
  referenceImageMimeType      String                    @map("reference_image_mime_type")
  referenceImageSizeBytes     Int                       @map("reference_image_size_bytes")
  analysisJson                Json?                     @map("analysis_json")
  analysisSummary             String?                   @map("analysis_summary")
  latestUserInstruction       String?                   @map("latest_user_instruction")
  disclaimerAcceptedAt        DateTime?                 @map("disclaimer_accepted_at")
  createdAt                   DateTime                  @default(now()) @map("created_at")
  updatedAt                   DateTime                  @updatedAt @map("updated_at")

  user                        User                      @relation(fields: [userId], references: [id])
  outputs                     AiGenerationOutput[]

  @@index([userId])
  @@index([status])
  @@map("ai_generation_sessions")
}

model AiGenerationOutput {
  id                    String                   @id @default(cuid())
  sessionId             String                   @map("session_id")
  userId                String                   @map("user_id")
  status                AiGenerationOutputStatus @default(pending)
  instructionSnapshot   String                   @map("instruction_snapshot")
  analysisSnapshot      Json?                    @map("analysis_snapshot")
  promptSnapshot        String                   @map("prompt_snapshot")
  outputImageStorageKey String?                  @map("output_image_storage_key")
  outputImageMimeType   String?                  @map("output_image_mime_type")
  chargedAmount         Int                      @map("charged_amount")
  currency              String                   @default("IDR")
  walletLedgerEntryId   String?                  @map("wallet_ledger_entry_id")
  refundLedgerEntryId   String?                  @map("refund_ledger_entry_id")
  idempotencyKey        String                   @unique @map("idempotency_key")
  provider              String                   @default("pollinations")
  providerRequestId     String?                  @map("provider_request_id")
  providerMetadata      Json?                    @map("provider_metadata")
  errorMessage          String?                  @map("error_message")
  createdAt             DateTime                 @default(now()) @map("created_at")
  updatedAt             DateTime                 @updatedAt @map("updated_at")

  session               AiGenerationSession      @relation(fields: [sessionId], references: [id])
  user                  User                     @relation(fields: [userId], references: [id])

  @@index([sessionId])
  @@index([userId])
  @@index([status])
  @@map("ai_generation_outputs")
}
```

- [ ] **Step 4: Add constants file**

Create `src/modules/ai-invoice/constants.ts`:

```ts
export const AI_INVOICE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const AI_INVOICE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const AI_INVOICE_FREE_ANALYSES_PER_DAY = 3;
export const AI_INVOICE_DEFAULT_GENERATION_PRICE_IDR = 10_000;
export const POLLINATIONS_DEFAULT_BASE_URL = "https://gen.pollinations.ai";
export const AI_INVOICE_DEFAULT_ANALYSIS_MODEL = "qwen-vision";
export const AI_INVOICE_DEFAULT_IMAGE_MODEL = "flux";

export function getAiInvoiceGenerationPrice(): number {
  const raw = process.env.AI_INVOICE_GENERATION_PRICE_IDR;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : AI_INVOICE_DEFAULT_GENERATION_PRICE_IDR;
}
```

- [ ] **Step 5: Update env example**

Append to `.env.example`:

```env
# Pollinations.ai provider for AI Reference Invoice Generator
POLLINATIONS_API_KEY=""
POLLINATIONS_BASE_URL="https://gen.pollinations.ai"
AI_INVOICE_ANALYSIS_MODEL="qwen-vision"
AI_INVOICE_IMAGE_MODEL="flux"
AI_INVOICE_GENERATION_PRICE_IDR="10000"
```

- [ ] **Step 6: Allow wallet debit type**

In `src/modules/wallet/service.ts`, change the `debitWallet` `entryType` union to:

```ts
  entryType: "download_debit" | "ai_generation_debit" | "manual_adjustment_debit",
```

- [ ] **Step 7: Validate schema and tests**

Run:

```bash
npx prisma validate
npm test -- tests/ai-invoice-service.test.ts
```

Expected: Prisma schema valid. Tests PASS.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma .env.example src/modules/wallet/service.ts src/modules/ai-invoice/constants.ts tests/ai-invoice-service.test.ts
git commit -m "feat: add AI invoice generation schema"
```

---

### Task 2: Private image storage

**Files:**
- Create: `src/modules/ai-invoice/storage.ts`
- Test: `tests/ai-invoice-storage.test.ts`

**Interfaces:**
- Produces: `buildAiReferenceImageStorageKey(input)`.
- Produces: `buildAiOutputImageStorageKey(input)`.
- Produces: `aiImageStorage.put(key, body, contentType)` and `aiImageStorage.get(key)`.

- [ ] **Step 1: Write failing storage tests**

Create `tests/ai-invoice-storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- tests/ai-invoice-storage.test.ts
```

Expected: FAIL because storage module does not exist.

- [ ] **Step 3: Create storage module**

Create `src/modules/ai-invoice/storage.ts`:

```ts
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
```

- [ ] **Step 4: Run storage tests**

```bash
npm test -- tests/ai-invoice-storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ai-invoice/storage.ts tests/ai-invoice-storage.test.ts
git commit -m "feat: add private AI image storage"
```

---

### Task 3: Pollinations provider client

**Files:**
- Create: `src/modules/ai-invoice/pollinations.ts`
- Test: `tests/ai-invoice-provider.test.ts`

**Interfaces:**
- Produces: `analyzeReferenceImage(input): Promise<AiInvoiceAnalysis>`.
- Produces: `generateInvoiceImage(input): Promise<GeneratedAiImage>`.
- Consumes: server env `POLLINATIONS_API_KEY`, model env names.

- [ ] **Step 1: Write failing provider tests**

Create `tests/ai-invoice-provider.test.ts`:

```ts
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
```

- [ ] **Step 2: Run failing provider tests**

```bash
npm test -- tests/ai-invoice-provider.test.ts
```

Expected: FAIL because provider module does not exist.

- [ ] **Step 3: Create provider client**

Create `src/modules/ai-invoice/pollinations.ts`:

```ts
import {
  AI_INVOICE_DEFAULT_ANALYSIS_MODEL,
  AI_INVOICE_DEFAULT_IMAGE_MODEL,
  POLLINATIONS_DEFAULT_BASE_URL,
} from "./constants";

export interface AiInvoiceAnalysis {
  summary: string;
  colors: string[];
  sections: string[];
  detectedText: string[];
}

export interface GeneratedAiImage {
  image: Buffer;
  mimeType: string;
  providerRequestId?: string;
  metadata: Record<string, unknown>;
}

function providerConfig() {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) throw new Error("Pollinations API key is not configured");
  return {
    apiKey,
    baseUrl: (process.env.POLLINATIONS_BASE_URL || POLLINATIONS_DEFAULT_BASE_URL).replace(/\/$/, ""),
    analysisModel: process.env.AI_INVOICE_ANALYSIS_MODEL || AI_INVOICE_DEFAULT_ANALYSIS_MODEL,
    imageModel: process.env.AI_INVOICE_IMAGE_MODEL || AI_INVOICE_DEFAULT_IMAGE_MODEL,
  };
}

function asAnalysis(content: string): AiInvoiceAnalysis {
  const parsed = JSON.parse(content) as Partial<AiInvoiceAnalysis>;
  return {
    summary: String(parsed.summary || "Analisa gambar invoice selesai"),
    colors: Array.isArray(parsed.colors) ? parsed.colors.map(String) : [],
    sections: Array.isArray(parsed.sections) ? parsed.sections.map(String) : [],
    detectedText: Array.isArray(parsed.detectedText) ? parsed.detectedText.map(String) : [],
  };
}

export async function analyzeReferenceImage(input: {
  image: Buffer;
  mimeType: string;
}): Promise<AiInvoiceAnalysis> {
  const config = providerConfig();
  const dataUrl = `data:${input.mimeType};base64,${input.image.toString("base64")}`;
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.analysisModel,
      messages: [
        {
          role: "system",
          content:
            "Analyze invoice reference images. Return strict JSON with keys summary, colors, sections, detectedText. No markdown.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analisa layout, warna, bagian, dan teks yang terlihat pada invoice ini." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error("Analisa AI gagal");
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Analisa AI gagal");
  return asAnalysis(content);
}

export async function generateInvoiceImage(input: { prompt: string }): Promise<GeneratedAiImage> {
  const config = providerConfig();
  const url = new URL(`${config.baseUrl}/image/${encodeURIComponent(input.prompt)}`);
  url.searchParams.set("model", config.imageModel);
  url.searchParams.set("private", "true");
  url.searchParams.set("nologo", "true");
  url.searchParams.set("width", "1024");
  url.searchParams.set("height", "1448");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });

  if (!response.ok) throw new Error("Generate AI gagal");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error("Generate AI gagal");
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    image: bytes,
    mimeType: contentType,
    providerRequestId: response.headers.get("x-request-id") || undefined,
    metadata: { model: config.imageModel, contentType },
  };
}
```

- [ ] **Step 4: Run provider tests**

```bash
npm test -- tests/ai-invoice-provider.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ai-invoice/pollinations.ts tests/ai-invoice-provider.test.ts
git commit -m "feat: add Pollinations AI invoice client"
```

---

### Task 4: AI invoice domain service with paid generation

**Files:**
- Create/Modify: `src/modules/ai-invoice/service.ts`
- Modify: `src/lib/errors.ts`
- Test: `tests/ai-invoice-service.test.ts`

**Interfaces:**
- Produces: `createAiInvoiceSession(userId, file)`.
- Produces: `analyzeAiInvoiceSession(userId, sessionId)`.
- Produces: `generateAiInvoiceOutput(userId, sessionId, input)`.
- Produces: `getAiInvoiceSession(userId, sessionId)`.
- Produces: `getAiInvoiceOutputForDownload(userId, outputId)`.

- [ ] **Step 1: Add failing service tests**

Extend `tests/ai-invoice-service.test.ts` after config tests:

```ts
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    aiGenerationSession: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    aiGenerationOutput: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/modules/wallet/service", () => ({
  debitWallet: vi.fn(),
  creditWallet: vi.fn(),
}));

vi.mock("@/modules/ai-invoice/storage", () => ({
  aiImageStorage: { put: vi.fn(), get: vi.fn() },
  buildAiReferenceImageStorageKey: vi.fn(() => "ai-invoice/reference/user-1/session-1.png"),
  buildAiOutputImageStorageKey: vi.fn(() => "ai-invoice/output/user-1/session-1/output-1.jpg"),
}));

vi.mock("@/modules/ai-invoice/pollinations", () => ({
  analyzeReferenceImage: vi.fn(),
  generateInvoiceImage: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { debitWallet, creditWallet } from "@/modules/wallet/service";
import { aiImageStorage } from "@/modules/ai-invoice/storage";
import { analyzeReferenceImage, generateInvoiceImage } from "@/modules/ai-invoice/pollinations";

const prismaMock = prisma as unknown as {
  aiGenerationSession: Record<string, ReturnType<typeof vi.fn>>;
  aiGenerationOutput: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};
const debitWalletMock = debitWallet as unknown as ReturnType<typeof vi.fn>;
const creditWalletMock = creditWallet as unknown as ReturnType<typeof vi.fn>;
const storageMock = aiImageStorage as unknown as { put: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
const analyzeMock = analyzeReferenceImage as unknown as ReturnType<typeof vi.fn>;
const generateMock = generateInvoiceImage as unknown as ReturnType<typeof vi.fn>;

describe("AI invoice service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_INVOICE_GENERATION_PRICE_IDR = "10000";
    prismaMock.$transaction.mockImplementation(async (callback) => callback({
      aiGenerationOutput: prismaMock.aiGenerationOutput,
      aiGenerationSession: prismaMock.aiGenerationSession,
    }));
  });

  it("rejects non-image upload", async () => {
    const { createAiInvoiceSession } = await import("@/modules/ai-invoice/service");
    await expect(
      createAiInvoiceSession("user-1", {
        name: "bad.txt",
        type: "text/plain",
        size: 10,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      } as File)
    ).rejects.toThrow("File harus berupa gambar JPG, PNG, atau WebP");
  });

  it("does not debit twice for same idempotency key", async () => {
    prismaMock.aiGenerationSession.findFirst.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      analysisJson: { summary: "x" },
      analysisSummary: "x",
    });
    prismaMock.aiGenerationOutput.findUnique.mockResolvedValue({ id: "output-existing", status: "success" });
    const { generateAiInvoiceOutput } = await import("@/modules/ai-invoice/service");

    const result = await generateAiInvoiceOutput("user-1", "session-1", {
      instruction: "ubah warna biru",
      disclaimerAccepted: true,
      idempotencyKey: "idem-1",
    });

    expect(result.id).toBe("output-existing");
    expect(debitWalletMock).not.toHaveBeenCalled();
  });

  it("refunds once when provider fails after debit", async () => {
    prismaMock.aiGenerationSession.findFirst.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      analysisJson: { summary: "layout" },
      analysisSummary: "layout",
    });
    prismaMock.aiGenerationOutput.findUnique.mockResolvedValue(null);
    prismaMock.aiGenerationOutput.create.mockResolvedValue({ id: "output-1" });
    debitWalletMock.mockResolvedValue({ id: "ledger-debit-1" });
    generateMock.mockRejectedValue(new Error("provider down"));
    prismaMock.aiGenerationOutput.update.mockResolvedValue({ id: "output-1", status: "refunded" });
    const { generateAiInvoiceOutput } = await import("@/modules/ai-invoice/service");

    await expect(
      generateAiInvoiceOutput("user-1", "session-1", {
        instruction: "ubah nama",
        disclaimerAccepted: true,
        idempotencyKey: "idem-fail",
      })
    ).rejects.toThrow("Generate AI gagal");

    expect(debitWalletMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      10000,
      "ai_generation_debit",
      "idem-fail",
      "ai_generation_output",
      "output-1",
      expect.any(String),
      "user",
      "user-1"
    );
    expect(creditWalletMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      10000,
      "refund_credit",
      "ai-generation-refund:output-1",
      "ai_generation_output",
      "output-1",
      expect.any(String),
      "system",
      undefined
    );
  });
});
```

- [ ] **Step 2: Run failing service tests**

```bash
npm test -- tests/ai-invoice-service.test.ts
```

Expected: FAIL because service module does not exist.

- [ ] **Step 3: Create service module**

Create `src/modules/ai-invoice/service.ts` with these exported signatures and behavior:

```ts
import { prisma } from "@/lib/db/prisma";
import { creditWallet, debitWallet } from "@/modules/wallet/service";
import {
  AI_INVOICE_ALLOWED_MIME_TYPES,
  AI_INVOICE_FREE_ANALYSES_PER_DAY,
  AI_INVOICE_MAX_IMAGE_BYTES,
  getAiInvoiceGenerationPrice,
} from "./constants";
import { analyzeReferenceImage, generateInvoiceImage } from "./pollinations";
import {
  aiImageStorage,
  buildAiOutputImageStorageKey,
  buildAiReferenceImageStorageKey,
} from "./storage";

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function assertInstruction(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length < 3) throw new Error("Instruksi perubahan wajib diisi");
  if (trimmed.length > 2000) throw new Error("Instruksi perubahan terlalu panjang");
  return trimmed;
}

function buildPrompt(input: { analysisSummary: string; instruction: string }): string {
  return [
    "Create a clean invoice document image based on this reference analysis.",
    "Keep the layout close to the reference, apply the user's requested changes, and produce a professional invoice-like image.",
    `Reference analysis: ${input.analysisSummary}`,
    `User changes: ${input.instruction}`,
    "Do not add watermark. Use sharp readable text. Mobile preview friendly portrait document.",
  ].join("\n");
}

export async function createAiInvoiceSession(userId: string, file: File) {
  if (!AI_INVOICE_ALLOWED_MIME_TYPES.includes(file.type as (typeof AI_INVOICE_ALLOWED_MIME_TYPES)[number])) {
    throw new Error("File harus berupa gambar JPG, PNG, atau WebP");
  }
  if (file.size > AI_INVOICE_MAX_IMAGE_BYTES) throw new Error("Ukuran gambar maksimal 5MB");

  const sessionId = crypto.randomUUID();
  const body = Buffer.from(await file.arrayBuffer());
  const storageKey = buildAiReferenceImageStorageKey({
    userId,
    sessionId,
    extension: extensionForMime(file.type),
  });
  await aiImageStorage.put(storageKey, body, file.type);

  return prisma.aiGenerationSession.create({
    data: {
      id: sessionId,
      userId,
      referenceImageStorageKey: storageKey,
      referenceImageMimeType: file.type,
      referenceImageSizeBytes: file.size,
      status: "uploaded",
    },
    include: { outputs: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getAiInvoiceSession(userId: string, sessionId: string) {
  const session = await prisma.aiGenerationSession.findFirst({
    where: { id: sessionId, userId },
    include: { outputs: { orderBy: { createdAt: "desc" } } },
  });
  if (!session) throw new Error("Sesi AI tidak ditemukan");
  return session;
}

export async function analyzeAiInvoiceSession(userId: string, sessionId: string) {
  const session = await prisma.aiGenerationSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Sesi AI tidak ditemukan");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiGenerationSession.count({
    where: { userId, analysisSummary: { not: null }, updatedAt: { gte: since } },
  });
  if (!session.analysisSummary && used >= AI_INVOICE_FREE_ANALYSES_PER_DAY) {
    throw new Error("Limit analisa gratis habis");
  }

  const image = await aiImageStorage.get(session.referenceImageStorageKey);
  const analysis = await analyzeReferenceImage({ image: image.body, mimeType: image.contentType });

  return prisma.aiGenerationSession.update({
    where: { id: session.id },
    data: {
      status: "analyzed",
      analysisJson: analysis,
      analysisSummary: analysis.summary,
    },
    include: { outputs: { orderBy: { createdAt: "desc" } } },
  });
}

export async function generateAiInvoiceOutput(
  userId: string,
  sessionId: string,
  input: { instruction: string; disclaimerAccepted: boolean; idempotencyKey: string }
) {
  if (!input.idempotencyKey) throw new Error("Idempotency key required");
  if (!input.disclaimerAccepted) throw new Error("Disclaimer wajib disetujui");
  const instruction = assertInstruction(input.instruction);

  const existing = await prisma.aiGenerationOutput.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;

  const session = await prisma.aiGenerationSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Sesi AI tidak ditemukan");
  if (!session.analysisSummary) throw new Error("Analisa gambar wajib dilakukan terlebih dahulu");

  const price = getAiInvoiceGenerationPrice();
  const prompt = buildPrompt({ analysisSummary: session.analysisSummary, instruction });

  const output = await prisma.$transaction(async (tx) => {
    const created = await tx.aiGenerationOutput.create({
      data: {
        sessionId: session.id,
        userId,
        status: "generating",
        instructionSnapshot: instruction,
        analysisSnapshot: session.analysisJson ?? undefined,
        promptSnapshot: prompt,
        chargedAmount: price,
        idempotencyKey: input.idempotencyKey,
        provider: "pollinations",
      },
    });
    const ledger = await debitWallet(
      tx,
      userId,
      price,
      "ai_generation_debit",
      input.idempotencyKey,
      "ai_generation_output",
      created.id,
      "Generate gambar invoice AI",
      "user",
      userId
    );
    await tx.aiGenerationSession.update({
      where: { id: session.id },
      data: {
        status: "generating",
        latestUserInstruction: instruction,
        disclaimerAcceptedAt: new Date(),
      },
    });
    return tx.aiGenerationOutput.update({
      where: { id: created.id },
      data: { walletLedgerEntryId: ledger.id },
    });
  });

  try {
    const generated = await generateInvoiceImage({ prompt });
    const key = buildAiOutputImageStorageKey({
      userId,
      sessionId: session.id,
      outputId: output.id,
      extension: extensionForMime(generated.mimeType),
    });
    await aiImageStorage.put(key, generated.image, generated.mimeType);
    return prisma.aiGenerationOutput.update({
      where: { id: output.id },
      data: {
        status: "success",
        outputImageStorageKey: key,
        outputImageMimeType: generated.mimeType,
        providerRequestId: generated.providerRequestId,
        providerMetadata: generated.metadata,
        session: { update: { status: "completed" } },
      },
    });
  } catch {
    await prisma.$transaction(async (tx) => {
      const refund = await creditWallet(
        tx,
        userId,
        price,
        "refund_credit",
        `ai-generation-refund:${output.id}`,
        "ai_generation_output",
        output.id,
        "Refund generate gambar invoice AI gagal",
        "system",
        undefined
      );
      await tx.aiGenerationOutput.update({
        where: { id: output.id },
        data: { status: "refunded", refundLedgerEntryId: refund.id, errorMessage: "Generate AI gagal" },
      });
      await tx.aiGenerationSession.update({ where: { id: session.id }, data: { status: "failed" } });
    });
    throw new Error("Generate AI gagal");
  }
}

export async function getAiInvoiceOutputForDownload(userId: string, outputId: string) {
  const output = await prisma.aiGenerationOutput.findFirst({
    where: { id: outputId, userId, status: "success" },
  });
  if (!output?.outputImageStorageKey) throw new Error("Hasil AI tidak ditemukan");
  return aiImageStorage.get(output.outputImageStorageKey);
}
```

- [ ] **Step 4: Add safe API messages**

Add these strings to `SAFE_API_MESSAGES` in `src/lib/errors.ts`:

```ts
  "File harus berupa gambar JPG, PNG, atau WebP",
  "Ukuran gambar maksimal 5MB",
  "Sesi AI tidak ditemukan",
  "Limit analisa gratis habis",
  "Instruksi perubahan wajib diisi",
  "Instruksi perubahan terlalu panjang",
  "Disclaimer wajib disetujui",
  "Analisa gambar wajib dilakukan terlebih dahulu",
  "Generate AI gagal",
  "Hasil AI tidak ditemukan",
```

- [ ] **Step 5: Run service tests**

```bash
npm test -- tests/ai-invoice-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/ai-invoice/service.ts src/lib/errors.ts tests/ai-invoice-service.test.ts
git commit -m "feat: add paid AI invoice generation service"
```

---

### Task 5: Authenticated API routes

**Files:**
- Create API route files listed above
- Test manually with app after UI task; unit coverage remains in service tests

**Interfaces:**
- Consumes: `requireUser()`.
- Consumes: AI invoice service exports from Task 4.
- Produces: JSON routes used by UI.

- [ ] **Step 1: Create session route**

Create `src/app/api/ai-invoice/sessions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { createAiInvoiceSession } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File harus berupa gambar JPG, PNG, atau WebP" }, { status: 400 });
    }
    const session = await createAiInvoiceSession(user.id, file);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
```

- [ ] **Step 2: Create read session route**

Create `src/app/api/ai-invoice/sessions/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { getAiInvoiceSession } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await getAiInvoiceSession(user.id, id));
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
```

- [ ] **Step 3: Create analyze route**

Create `src/app/api/ai-invoice/sessions/[id]/analyze/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { analyzeAiInvoiceSession } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await analyzeAiInvoiceSession(user.id, id));
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
```

- [ ] **Step 4: Create generate route**

Create `src/app/api/ai-invoice/sessions/[id]/generate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { generateAiInvoiceOutput } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const output = await generateAiInvoiceOutput(user.id, id, {
      instruction: String(body.instruction || ""),
      disclaimerAccepted: body.disclaimerAccepted === true,
      idempotencyKey: String(body.idempotencyKey || ""),
    });
    return NextResponse.json(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Saldo tidak mencukupi") ? 402 : 500;
    return NextResponse.json({ error: safeApiError(error) }, { status });
  }
}
```

- [ ] **Step 5: Create download route**

Create `src/app/api/ai-invoice/outputs/[id]/download/route.ts`:

```ts
import { requireUser } from "@/modules/auth/session";
import { getAiInvoiceOutputForDownload } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const image = await getAiInvoiceOutputForDownload(user.id, id);
    return new Response(image.body, {
      headers: {
        "Content-Type": image.contentType,
        "Content-Disposition": `attachment; filename="ai-invoice-${id}.${image.contentType.includes("png") ? "png" : "jpg"}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 404;
    return Response.json({ error: safeApiError(error) }, { status });
  }
}
```

- [ ] **Step 6: Typecheck API routes**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/ai-invoice
git commit -m "feat: add AI invoice generator APIs"
```

---

### Task 6: Mobile-first UI and navigation

**Files:**
- Create: `src/components/ai-invoice/ai-invoice-generator.tsx`
- Create: `src/app/app/ai-invoice-generator/page.tsx`
- Modify: `src/app/app/layout.tsx`
- Modify: `src/components/layout/mobile-nav.tsx`

**Interfaces:**
- Consumes API routes from Task 5.
- Produces page `/app/ai-invoice-generator`.

- [ ] **Step 1: Create page wrapper**

Create `src/app/app/ai-invoice-generator/page.tsx`:

```tsx
import { getAiInvoiceGenerationPrice } from "@/modules/ai-invoice/constants";
import { AiInvoiceGenerator } from "@/components/ai-invoice/ai-invoice-generator";

export default function AiInvoiceGeneratorPage() {
  return <AiInvoiceGenerator price={getAiInvoiceGenerationPrice()} />;
}
```

- [ ] **Step 2: Create client component**

Create `src/components/ai-invoice/ai-invoice-generator.tsx`:

```tsx
"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Sparkles, Upload, Wand2, Download, AlertCircle } from "lucide-react";

type Output = { id: string; status: string; outputImageStorageKey?: string | null };
type Session = {
  id: string;
  status: string;
  analysisSummary?: string | null;
  outputs: Output[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
}

export function AiInvoiceGenerator({ price }: { price: number }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [instruction, setInstruction] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return setError("Pilih gambar referensi dulu");
    setLoading("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ai-invoice/sessions", { method: "POST", body: form });
      setSession(await readJson(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setLoading(null);
    }
  }

  async function analyze() {
    if (!session) return;
    setLoading("analyze");
    setError(null);
    try {
      const res = await fetch(`/api/ai-invoice/sessions/${session.id}/analyze`, { method: "POST" });
      setSession(await readJson(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisa gagal");
    } finally {
      setLoading(null);
    }
  }

  async function generate() {
    if (!session) return;
    setLoading("generate");
    setError(null);
    try {
      const res = await fetch(`/api/ai-invoice/sessions/${session.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          disclaimerAccepted: accepted,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      await readJson(res);
      const fresh = await fetch(`/api/ai-invoice/sessions/${session.id}`);
      setSession(await readJson(fresh));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generate gagal";
      if (message.toLowerCase().includes("saldo")) {
        setError(`${message}. Silakan top up saldo terlebih dahulu.`);
      } else {
        setError(message);
      }
    } finally {
      setLoading(null);
    }
  }

  const successOutput = session?.outputs?.find((output) => output.status === "success");

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-100">
          AI Generate dari Gambar <Sparkles className="h-5 w-5 text-purple-400" />
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload referensi invoice, analisa gratis terbatas, lalu generate gambar AI berbayar saldo.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
        <label htmlFor={inputId} className="block text-sm font-semibold text-zinc-200">1. Upload gambar referensi</label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300"
        />
        <button onClick={upload} disabled={!file || !!loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          <Upload className="h-4 w-4" /> {loading === "upload" ? "Mengupload..." : "Upload Referensi"}
        </button>
      </section>

      {session && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">2. Analisa AI gratis terbatas</h2>
          {session.analysisSummary ? (
            <p className="rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">{session.analysisSummary}</p>
          ) : (
            <button onClick={analyze} disabled={!!loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              <Wand2 className="h-4 w-4" /> {loading === "analyze" ? "Menganalisa..." : "Analisa Gratis"}
            </button>
          )}
        </section>
      )}

      {session?.analysisSummary && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">3. Instruksi perubahan</h2>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={5}
            placeholder="Contoh: ganti warna jadi biru, nama perusahaan jadi PT Contoh, item jasa desain 1 x Rp500.000"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-indigo-500"
          />
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1" />
              <span>Hasil dibuat oleh AI berdasarkan referensi dan instruksi pengguna. Pengguna bertanggung jawab penuh atas hak penggunaan, isi, klaim, dan konsekuensi hukum. DokMaker dapat menolak penggunaan yang melanggar hukum atau merugikan pihak lain.</span>
            </label>
          </div>
          <button onClick={generate} disabled={!!loading || !accepted} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {loading === "generate" ? "Generating..." : `Generate & Potong Saldo ${formatCurrency(price)}`}
          </button>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error} {error.toLowerCase().includes("saldo") && <Link href="/app/wallet" className="font-semibold underline">Top up saldo</Link>}</p>
        </div>
      )}

      {successOutput && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-200">Hasil siap diunduh</h2>
          <a href={`/api/ai-invoice/outputs/${successOutput.id}/download`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
            <Download className="h-4 w-4" /> Download Gambar AI
          </a>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add nav entries**

In `src/app/app/layout.tsx`, import `Sparkles` from `lucide-react`, add to desktop `navigation`:

```ts
{ name: "AI Generator", href: "/app/ai-invoice-generator", icon: Sparkles },
```

In `MobileBottomNav`, replace the center `/app/invoices/new` link with `/app/ai-invoice-generator` and label `AI` if keeping only five items. Keep invoice and wallet links unchanged.

In `src/components/layout/mobile-nav.tsx`, import `Sparkles` and add:

```ts
{ name: "AI Generator", href: "/app/ai-invoice-generator", icon: Sparkles },
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ai-invoice src/app/app/ai-invoice-generator src/app/app/layout.tsx src/components/layout/mobile-nav.tsx
git commit -m "feat: add AI invoice generator UI"
```

---

### Task 7: Verification and migration

**Files:**
- Generated migration under `prisma/migrations/*`

**Interfaces:**
- Consumes all prior tasks.
- Produces verified working branch.

- [ ] **Step 1: Generate Prisma migration**

Run:

```bash
npx prisma migrate dev --name add-ai-invoice-generator
```

Expected: migration created and applied locally.

- [ ] **Step 2: Run focused tests**

```bash
npm test -- tests/ai-invoice-service.test.ts tests/ai-invoice-provider.test.ts tests/ai-invoice-storage.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run required verification**

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

Expected: all PASS. If a command fails, fix the smallest cause before continuing.

- [ ] **Step 4: Manual smoke test**

With valid env and enough wallet balance:

```text
1. Login as normal user.
2. Open /app/ai-invoice-generator on 360px-wide viewport.
3. Upload JPG/PNG/WebP under 5MB.
4. Click Analisa Gratis and confirm summary appears.
5. Enter instruction text.
6. Tick disclaimer.
7. Click Generate & Potong Saldo.
8. Confirm wallet ledger has ai_generation_debit.
9. Download generated image.
10. Repeat same browser request with same idempotency key by replaying the request and confirm no second debit.
```

- [ ] **Step 5: Commit migration and final fixes**

```bash
git add prisma/migrations prisma/schema.prisma src tests .env.example
git commit -m "chore: verify AI invoice generator"
```

---

## Self-Review Checklist

- Spec coverage: upload, free analysis, paid generate, private output download, Pollinations provider, wallet debit, refund-on-failure, idempotency, ownership, mobile UI, and server-side price are covered.
- Dependency check: uses native `fetch`; no new npm package.
- Financial safety: debit/refund only in service and wallet helpers; client never mutates wallet.
- Storage safety: API streams private object; no permanent public URL.
- Known simplification: v1 uses detailed vision analysis to guide image generation, not direct image-to-image transfer. Upgrade path is to add Pollinations reference-image flow using provider-supported upload or temporary signed URL if needed.
