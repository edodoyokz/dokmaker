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
