import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import { renderDocumentTemplateHtml } from "@/modules/templates/render-template";
import {
  isSupportedDocumentType,
} from "@/modules/documents/document-type-registry";
import type { DocumentType } from "@/modules/documents/types";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { pdfStorage } from "@/modules/downloads/pdf-storage";

export type InvoiceRenderTemplate = {
  htmlTemplate: string;
  documentType?: DocumentType | string;
};

interface PageLike {
  setContent(html: string, options: { waitUntil: string }): Promise<void>;
  pdf(options: {
    format: string;
    printBackground: boolean;
    margin: { top: string; right: string; bottom: string; left: string };
  }): Promise<Uint8Array | Buffer>;
}

interface BrowserLike {
  newPage(): Promise<PageLike>;
  close(): Promise<void>;
}

interface PuppeteerLike {
  launch(options: { headless: boolean }): Promise<BrowserLike>;
}

interface PuppeteerModuleLike {
  default: PuppeteerLike;
}

interface GenerateInvoicePdfOptions {
  template?: InvoiceRenderTemplate;
  loadPuppeteer?: () => Promise<PuppeteerModuleLike>;
}

let cachedPuppeteerModule: PuppeteerModuleLike | null = null;

// On Vercel serverless, @sparticuz/chromium's 64MB brotli binary exceeds the
// 50MB function zip limit and is stripped from the deployment. We upload it
// to R2 once (scripts/upload-chromium-to-r2.mjs) and download to /tmp on the
// first cold start of each Lambda container. Subsequent warm invocations reuse
// the cached binary.
const CHROMIUM_TMP_DIR = "/tmp/chromium-bin";
const R2_CHROMIUM_PREFIX = "chromium-bin";

interface ChromiumLike {
  args: string[];
  executablePath(input?: string): Promise<string>;
}

async function resolveChromiumExecutablePath(
  chromium: ChromiumLike
): Promise<string> {
  // Local dev / container: binary is bundled in node_modules, use it directly.
  if (!process.env.VERCEL) {
    return chromium.executablePath();
  }

  // Vercel: binary stripped from deployment — download from R2 on first use.
  const brPath = `${CHROMIUM_TMP_DIR}/chromium.br`;
  if (!existsSync(brPath)) {
    mkdirSync(CHROMIUM_TMP_DIR, { recursive: true });

    // chromium.br (~62MB) — the browser binary itself.
    const chromiumBr = await pdfStorage.get(`${R2_CHROMIUM_PREFIX}/chromium.br`);
    writeFileSync(brPath, chromiumBr);

    // These sidecar archives are opened by @sparticuz/chromium when resolving
    // executablePath(input). Keep them beside chromium.br in the input dir.
    for (const fileName of ["al2023.tar.br", "fonts.tar.br"]) {
      const bytes = await pdfStorage.get(`${R2_CHROMIUM_PREFIX}/${fileName}`);
      writeFileSync(`${CHROMIUM_TMP_DIR}/${fileName}`, bytes);
    }
  }

  return chromium.executablePath(CHROMIUM_TMP_DIR);
}

async function loadRuntimePuppeteer(): Promise<PuppeteerModuleLike> {
  if (cachedPuppeteerModule) {
    return cachedPuppeteerModule;
  }

  // Vercel serverless + @sparticuz/chromium production path
  try {
    const chromiumModule = await import("@sparticuz/chromium");
    const chromium = chromiumModule.default ?? chromiumModule;
    const puppeteerModule = await import("puppeteer-core");

    const puppeteerLike: PuppeteerModuleLike = {
      default: {
        launch: async () => {
          const browser = await puppeteerModule.default.launch({
            args: chromium.args,
            defaultViewport: { width: 1920, height: 1080 },
            executablePath: await resolveChromiumExecutablePath(chromium),
            headless: true,
          });
          return browser as BrowserLike;
        },
      },
    };

    cachedPuppeteerModule = puppeteerLike;
    return puppeteerLike;
  } catch {
    // Fallback: try global puppeteer (container/VPS with system Chromium)
    try {
      const runtimeEval = globalThis.eval as typeof eval;
      const imported = (await runtimeEval('import("puppeteer")')) as PuppeteerModuleLike;
      cachedPuppeteerModule = imported;
      return imported;
    } catch {
      throw new Error(
        "PDF engine unavailable. Install puppeteer-core + @sparticuz/chromium for Vercel, or puppeteer for containers."
      );
    }
  }
}

/**
 * Generate HTML for final invoice PDF.
 * Uses the provided template HTML when available, otherwise falls back
 * to the built-in hardcoded layout.
 */
export function generateInvoiceHtml(
  content: unknown,
  template?: InvoiceRenderTemplate
): string {
  const effectiveType = template?.documentType ?? "invoice";
  const documentType: DocumentType = isSupportedDocumentType(effectiveType)
    ? (effectiveType as DocumentType)
    : "invoice";

  if (template?.htmlTemplate) {
    const bodyHtml = renderDocumentTemplateHtml({
      htmlTemplate: template.htmlTemplate,
      documentType,
      content,
      mode: "final",
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>
`.trim();
  }

  // Fallback: existing hardcoded layout for backward compatibility.
  // Only valid for invoice-shaped content. Non-invoice documents MUST provide a template.
  if (!template?.htmlTemplate && documentType !== "invoice") {
    throw new Error(
      `PDF generation for document type "${documentType}" requires an htmlTemplate.`
    );
  }

  const invoiceContent = content as InvoiceContent;
  const total = invoiceContent.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .header h1 { font-size: 28px; color: #1a1a1a; }
    .header .meta { text-align: right; color: #666; font-size: 14px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    .party-name { font-weight: 600; margin-bottom: 4px; }
    .party-detail { font-size: 14px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; padding: 10px 0; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; color: #999; }
    th:last-child, td:last-child { text-align: right; }
    td { padding: 12px 0; border-bottom: 1px solid #eee; }
    .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #333; border-bottom: none; }
    .notes { margin-top: 30px; }
    .notes-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    .notes-text { font-size: 14px; color: #666; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <div style="color: #666; margin-top: 4px;">${invoiceContent.meta.invoiceNumber}</div>
    </div>
    <div class="meta">
      <div>Tanggal: ${invoiceContent.meta.issueDate}</div>
      ${invoiceContent.meta.dueDate ? `<div>Jatuh Tempo: ${invoiceContent.meta.dueDate}</div>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Pengirim</div>
      <div class="party-name">${invoiceContent.sender.name}</div>
      ${invoiceContent.sender.address ? `<div class="party-detail">${invoiceContent.sender.address}</div>` : ""}
      ${invoiceContent.sender.email ? `<div class="party-detail">${invoiceContent.sender.email}</div>` : ""}
    </div>
    <div class="party">
      <div class="party-label">Klien</div>
      <div class="party-name">${invoiceContent.client.name}</div>
      ${invoiceContent.client.address ? `<div class="party-detail">${invoiceContent.client.address}</div>` : ""}
      ${invoiceContent.client.email ? `<div class="party-detail">${invoiceContent.client.email}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Deskripsi</th>
        <th style="text-align: right">Qty</th>
        <th style="text-align: right">Harga</th>
        <th style="text-align: right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceContent.items
        .map(
          (item) => `
        <tr>
          <td>${item.description}</td>
          <td style="text-align: right">${item.quantity}</td>
          <td style="text-align: right">Rp${item.unitPrice.toLocaleString("id-ID")}</td>
          <td style="text-align: right">Rp${(item.quantity * item.unitPrice).toLocaleString("id-ID")}</td>
        </tr>
      `
        )
        .join("")}
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td>Rp${total.toLocaleString("id-ID")}</td>
      </tr>
    </tbody>
  </table>

  ${
    invoiceContent.notes
      ? `
    <div class="notes">
      <div class="notes-label">Catatan</div>
      <div class="notes-text">${invoiceContent.notes}</div>
    </div>
  `
      : ""
  }

  ${
    invoiceContent.paymentInstruction
      ? `
    <div class="notes">
      <div class="notes-label">Instruksi Pembayaran</div>
      <div class="notes-text">${invoiceContent.paymentInstruction}</div>
    </div>
  `
      : ""
  }
</body>
</html>
  `.trim();
}

/**
 * Generate PDF from invoice content.
 * Uses Puppeteer/Playwright for HTML-to-PDF conversion.
 * For now, returns the HTML as a placeholder.
 */
export async function generateInvoicePdf(
  content: unknown,
  options: GenerateInvoicePdfOptions = {}
): Promise<Buffer> {
  const html = generateInvoiceHtml(content, options.template);
  const loadPuppeteer = options.loadPuppeteer ?? loadRuntimePuppeteer;

  let browser: BrowserLike | null = null;

  try {
    const puppeteer = await loadPuppeteer();
    browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });
    return Buffer.from(pdfBuffer);
  } catch (error) {
    throw new Error(
      `PDF engine unavailable for final invoice generation: ${error instanceof Error ? error.message : "unknown error"}`
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore browser close errors so the original PDF failure is preserved.
      }
    }
  }
}
