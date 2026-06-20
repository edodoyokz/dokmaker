/**
 * PDF artifact storage for paid invoice versions.
 *
 * MVP local in-memory implementation. NOT for production.
 * Task 7 will replace this with Cloudflare R2 (S3-compatible) backend
 * behind the same PdfStorage interface.
 *
 * Final PDFs must NEVER be served via public permanent URLs.
 * They are only streamed through authenticated backend routes.
 */

export interface PdfStorage {
  put(key: string, pdf: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

const memoryStorage = new Map<string, Buffer>();

export const pdfStorage: PdfStorage = {
  async put(key, pdf) {
    memoryStorage.set(key, Buffer.from(pdf));
  },
  async get(key) {
    const pdf = memoryStorage.get(key);
    if (!pdf) throw new Error("Final PDF artifact tidak ditemukan");
    return Buffer.from(pdf);
  },
};

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
