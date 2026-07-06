import {
  AI_INVOICE_DEFAULT_ANALYSIS_MODEL,
  AI_INVOICE_DEFAULT_IMAGE_MODEL,
  POLLINATIONS_DEFAULT_BASE_URL,
} from "./constants";

export interface AiInvoiceField {
  label: string;
  value: string;
}

export interface AiInvoiceAnalysis {
  summary: string;
  documentType: string;
  colors: string[];
  sections: string[];
  detectedText: string[];
  fields: AiInvoiceField[];
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
  let parsed: Partial<AiInvoiceAnalysis>;
  try {
    parsed = JSON.parse(content) as Partial<AiInvoiceAnalysis>;
  } catch {
    throw new Error("Analisa AI gagal");
  }
  const fields: AiInvoiceField[] = Array.isArray(parsed.fields)
    ? parsed.fields
        .filter((f) => f !== null && typeof f === "object")
        .map((f) => ({ label: String((f as { label?: unknown }).label ?? ""), value: String((f as { value?: unknown }).value ?? "") }))
        .filter((f) => f.label)
    : [];
  return {
    summary: String(parsed.summary || "Analisa gambar invoice selesai"),
    documentType: String(parsed.documentType || "invoice"),
    colors: Array.isArray(parsed.colors) ? parsed.colors.map(String) : [],
    sections: Array.isArray(parsed.sections) ? parsed.sections.map(String) : [],
    detectedText: Array.isArray(parsed.detectedText) ? parsed.detectedText.map(String) : [],
    fields,
  };
}

const ANALYSIS_SYSTEM_PROMPT = `Analyze invoice/receipt reference images. Return strict JSON with keys:
- summary: short description of the document
- documentType: type detected (invoice, receipt, tax invoice, proforma, etc.)
- colors: dominant colors as hex or names
- sections: layout sections visible (header, items table, totals, footer, etc.)
- detectedText: other text not captured in fields
- fields: array of {label, value} for every fillable field detected. Include but not limited to: company/sender name, invoice number, issue date, due date, customer/recipient name, line items (concatenated), subtotal, tax, discount, total, payment terms, bank/account, contact. Use the exact label seen on the document and the exact value. Omit empty fields. No markdown.`;

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
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analisa layout, warna, bagian, field, dan teks yang terlihat pada invoice ini." },
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

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function generateInvoiceImage(input: {
  prompt: string;
  referenceImage?: { body: Buffer; mimeType: string };
}): Promise<GeneratedAiImage> {
  const config = providerConfig();
  const url = new URL(`${config.baseUrl}/image/${encodeURIComponent(input.prompt)}`);
  url.searchParams.set("model", config.imageModel);
  url.searchParams.set("private", "true");
  url.searchParams.set("nologo", "true");
  url.searchParams.set("width", "1024");
  url.searchParams.set("height", "1448");

  // img2img: POST multipart with the reference image so the model edits the
  // actual document instead of generating from a text-only prompt.
  let init: RequestInit;
  if (input.referenceImage) {
    const form = new FormData();
    form.append(
      "image",
      new Blob([new Uint8Array(input.referenceImage.body)], { type: input.referenceImage.mimeType }),
      `reference.${extensionForMime(input.referenceImage.mimeType)}`
    );
    init = {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
    };
  } else {
    init = { headers: { Authorization: `Bearer ${config.apiKey}` } };
  }

  const response = await fetch(url.toString(), init);

  if (!response.ok) throw new Error("Generate AI gagal");
  const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!contentType.startsWith("image/")) throw new Error("Generate AI gagal");
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    image: bytes,
    mimeType: contentType,
    providerRequestId: response.headers.get("x-request-id") || undefined,
    metadata: { model: config.imageModel, contentType, mode: input.referenceImage ? "img2img" : "text2image" },
  };
}
