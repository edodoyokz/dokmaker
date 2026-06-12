import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";

/**
 * Generate HTML for final invoice PDF.
 * This produces a clean invoice without watermark.
 */
export function generateInvoiceHtml(content: InvoiceContent): string {
  const total = content.items.reduce(
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
      <div style="color: #666; margin-top: 4px;">${content.meta.invoiceNumber}</div>
    </div>
    <div class="meta">
      <div>Tanggal: ${content.meta.issueDate}</div>
      ${content.meta.dueDate ? `<div>Jatuh Tempo: ${content.meta.dueDate}</div>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Pengirim</div>
      <div class="party-name">${content.sender.name}</div>
      ${content.sender.address ? `<div class="party-detail">${content.sender.address}</div>` : ""}
      ${content.sender.email ? `<div class="party-detail">${content.sender.email}</div>` : ""}
    </div>
    <div class="party">
      <div class="party-label">Klien</div>
      <div class="party-name">${content.client.name}</div>
      ${content.client.address ? `<div class="party-detail">${content.client.address}</div>` : ""}
      ${content.client.email ? `<div class="party-detail">${content.client.email}</div>` : ""}
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
      ${content.items
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
    content.notes
      ? `
    <div class="notes">
      <div class="notes-label">Catatan</div>
      <div class="notes-text">${content.notes}</div>
    </div>
  `
      : ""
  }

  ${
    content.paymentInstruction
      ? `
    <div class="notes">
      <div class="notes-label">Instruksi Pembayaran</div>
      <div class="notes-text">${content.paymentInstruction}</div>
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
  content: InvoiceContent
): Promise<Buffer> {
  const html = generateInvoiceHtml(content);

  // Try to use Puppeteer if available
  try {
    const puppeteer = await import("puppeteer" as string);
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch {
    // Fallback: return HTML buffer if Puppeteer not available
    // In production, this should fail with a proper error
    console.warn(
      "Puppeteer not available, returning HTML buffer as fallback"
    );
    return Buffer.from(html, "utf-8");
  }
}
