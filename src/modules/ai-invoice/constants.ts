export const AI_INVOICE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const AI_INVOICE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const AI_INVOICE_FREE_ANALYSES_PER_DAY = 20;
export const AI_INVOICE_DEFAULT_GENERATION_PRICE_IDR = 10_000;
export const POLLINATIONS_DEFAULT_BASE_URL = "https://gen.pollinations.ai";
export const AI_INVOICE_DEFAULT_ANALYSIS_MODEL = "qwen-vision";
export const AI_INVOICE_DEFAULT_IMAGE_MODEL = "gptimage-large";

export function getAiInvoiceGenerationPrice(): number {
  const raw = process.env.AI_INVOICE_GENERATION_PRICE_IDR;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : AI_INVOICE_DEFAULT_GENERATION_PRICE_IDR;
}
