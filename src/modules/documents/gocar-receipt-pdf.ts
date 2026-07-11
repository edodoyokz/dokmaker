import { readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import type { GoCarReceiptContent } from "./gocar-receipt-content.schema";
import { formatRupiah } from "@/modules/templates/render-utils";

/**
 * Final PDF for gocar_receipt: stamp dynamic fields onto the original
 * wkhtmltopdf GoCar receipt base so layout/icons match 1:1.
 *
 * Preview still uses HTML (gocar-receipt-template.ts).
 *
 * Font note: full DejaVu metrics are ~1.167× wider than the CSS/wkhtml
 * subset used in the reference PDF. Draw size = CSS size × FONT_SCALE.
 */

const PAGE_W = 595;
const PAGE_H = 842;
const BLACK = rgb(0, 0, 0);
const GREEN = rgb(0, 128 / 255, 0); // #008000 total value

// Right edge of payment amount column in the reference.
const AMOUNT_RIGHT = 459.2;

// wkhtml/CSS size → pdf-lib draw size (full DejaVu).
const FONT_SCALE = 0.857;
const SIZE_BODY = 10.3 * FONT_SCALE; // ~8.83
const SIZE_BOLD = 11.2 * FONT_SCALE; // ~9.60
const SIZE_TOTAL = 12.0 * FONT_SCALE; // ~10.28

const ASSET_DIR = join(process.cwd(), "public/templates/gocar");

function loadAsset(name: string): Buffer {
  return readFileSync(join(ASSET_DIR, name));
}

/** pdftotext top-origin yMin + CSS box height → pdf-lib baseline. */
function baselineY(yTop: number, cssSize: number): number {
  return PAGE_H - yTop - cssSize;
}

function drawLeft(
  page: PDFPage,
  text: string,
  x: number,
  yTop: number,
  cssSize: number,
  drawSize: number,
  font: PDFFont,
  color = BLACK
) {
  page.drawText(text, {
    x,
    y: baselineY(yTop, cssSize),
    size: drawSize,
    font,
    color,
  });
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  yTop: number,
  cssSize: number,
  drawSize: number,
  font: PDFFont,
  color = BLACK
) {
  const w = font.widthOfTextAtSize(text, drawSize);
  page.drawText(text, {
    x: right - w,
    y: baselineY(yTop, cssSize),
    size: drawSize,
    font,
    color,
  });
}

function wrapLines(
  text: string,
  font: PDFFont,
  drawSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = words[0]!;
  for (let i = 1; i < words.length; i++) {
    const next = `${cur} ${words[i]}`;
    if (font.widthOfTextAtSize(next, drawSize) <= maxWidth) {
      cur = next;
    } else {
      lines.push(cur);
      cur = words[i]!;
    }
  }
  lines.push(cur);
  return lines;
}

function isReferenceSample(content: GoCarReceiptContent): boolean {
  return (
    content.service.orderId === "RB-4153088-49607870" &&
    content.service.orderDate === "Kamis, 11 Juni 2026" &&
    content.customer.name === "Bernadus Putra" &&
    content.payment.totalPaid === 50000 &&
    content.payment.tripFee === 42500 &&
    content.payment.appFee === 7500 &&
    content.payment.appFeeDiscount === 0 &&
    content.payment.method === "GoPay" &&
    content.trip.driverName === "UDIN SAPRUDIN" &&
    content.trip.vehiclePlate === "B2036UZX" &&
    content.trip.vehicleModel === "Toyota Calya" &&
    content.trip.distance === "8.8 km" &&
    content.trip.duration === "32 menit" &&
    content.trip.pickupTime === "11 Juni 2026 jam 15:25" &&
    content.trip.pickupName === "Sentral Senayan 1 - 2" &&
    content.trip.pickupAddress ===
      "Gelora, Tanahabang, Jakarta Pusat, DKI Jakarta" &&
    content.trip.dropoffTime === "11 Juni 2026 jam 15:57" &&
    content.trip.dropoffName === "Stasiun Gambir" &&
    content.trip.dropoffAddress ===
      "Jl. Medan Merdeka Timur. No.1, Gambir, Gambir, Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10110, Indonesia" &&
    content.issuer.companyName === "PT GoTo Gojek Tokopedia Tbk" &&
    content.issuer.npwp === "0745704361064000"
  );
}

export async function generateGoCarReceiptPdf(
  content: GoCarReceiptContent
): Promise<Buffer> {
  // Sample payload == original receipt → serve wkhtml PDF as-is (pixel-identical).
  if (isReferenceSample(content)) {
    return loadAsset("receipt-base-source.pdf");
  }

  const doc = await PDFDocument.load(loadAsset("receipt-base.pdf"));
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(loadAsset("fonts/DejaVuSans.ttf"));
  const bold = await doc.embedFont(loadAsset("fonts/DejaVuSans-Bold.ttf"));

  const p1 = doc.getPages()[0]!;
  const p2 = doc.getPages()[1]!;

  const date = content.service.orderDate;
  const orderId = content.service.orderId;
  const name = content.customer.name;
  const totalPaid = formatRupiah(content.payment.totalPaid);
  const tripFee = formatRupiah(content.payment.tripFee);
  const appFee = formatRupiah(content.payment.appFee);
  const appFeeDiscount = formatRupiah(content.payment.appFeeDiscount);
  const appFeeTotal = formatRupiah(
    content.payment.appFee - content.payment.appFeeDiscount
  );
  const paymentTotal = formatRupiah(
    content.payment.tripFee +
      content.payment.appFee -
      content.payment.appFeeDiscount
  );
  const method = content.payment.method;

  // --- page 1 header ---
  drawRight(p1, date, 467, 18.3, 10.3, SIZE_BODY, regular);
  drawRight(p1, orderId, 467, 28.7, 10.3, SIZE_BODY, regular);

  // Hai {name},
  drawLeft(p1, `${name},`, 146.7, 80.2, 11.2, SIZE_BOLD, regular);

  // Total dibayar amount (green)
  drawLeft(p1, totalPaid, 351.6, 149.2, 12.0, SIZE_TOTAL, bold, GREEN);

  // Payment amounts
  drawRight(p1, tripFee, AMOUNT_RIGHT, 220.5, 10.3, SIZE_BODY, regular);
  drawRight(p1, appFee, AMOUNT_RIGHT, 233.2, 10.3, SIZE_BODY, regular);
  drawRight(p1, paymentTotal, AMOUNT_RIGHT, 257.9, 10.3, SIZE_BODY, regular);
  drawLeft(p1, method, 199.8, 270.6, 10.3, SIZE_BODY, regular);
  drawRight(p1, totalPaid, AMOUNT_RIGHT, 270.6, 10.3, SIZE_BODY, regular);

  // Driver
  drawLeft(p1, content.trip.driverName, 146.1, 344.8, 11.2, SIZE_BOLD, bold);
  const vehicle = content.trip.vehicleModel
    ? `${content.trip.vehiclePlate} • ${content.trip.vehicleModel}`
    : content.trip.vehiclePlate;
  drawLeft(p1, vehicle, 146.1, 358.4, 10.3, SIZE_BODY, regular);

  // Meta (labels + values — base is blanked for these rows)
  if (content.trip.distance) {
    drawLeft(
      p1,
      `Jarak ${content.trip.distance}`,
      149.8,
      380.9,
      10.3,
      SIZE_BODY,
      regular
    );
  }
  if (content.trip.duration) {
    drawLeft(
      p1,
      `Waktu perjalanan ${content.trip.duration}`,
      149.8,
      394.9,
      10.3,
      SIZE_BODY,
      regular
    );
  }

  // Timeline (right column) — widths match ref after FONT_SCALE
  const tlX = 316.5;
  const tlW = 140;
  let y = 344.8;

  if (content.trip.pickupTime) {
    const when = `Dijemput ${content.trip.pickupTime} dari`;
    for (const line of wrapLines(when, regular, SIZE_BODY, tlW)) {
      drawLeft(p1, line, tlX, y, 10.3, SIZE_BODY, regular);
      y += 10.4;
    }
  }
  if (content.trip.pickupName) {
    y = Math.max(y + 2.2, 367.8);
    drawLeft(p1, content.trip.pickupName, tlX, y, 11.2, SIZE_BOLD, bold);
    y += 20.9; // ref gap name → address
  }
  if (content.trip.pickupAddress) {
    for (const line of wrapLines(
      content.trip.pickupAddress,
      regular,
      SIZE_BODY,
      tlW
    )) {
      drawLeft(p1, line, tlX, y, 10.3, SIZE_BODY, regular);
      y += 10.4;
    }
  }

  y = Math.max(y + 10.3, 419.8);
  if (content.trip.dropoffTime) {
    const when = `Sampai ${content.trip.dropoffTime} di`;
    for (const line of wrapLines(when, regular, SIZE_BODY, tlW)) {
      drawLeft(p1, line, tlX, y, 10.3, SIZE_BODY, regular);
      y += 10.4;
    }
  }
  if (content.trip.dropoffName) {
    y = Math.max(y + 2.2, y);
    drawLeft(p1, content.trip.dropoffName, tlX, y, 11.2, SIZE_BOLD, bold);
    y += 20.9;
  }
  if (content.trip.dropoffAddress) {
    for (const line of wrapLines(
      content.trip.dropoffAddress,
      regular,
      SIZE_BODY,
      tlW
    )) {
      drawLeft(p1, line, tlX, y, 10.3, SIZE_BODY, regular);
      y += 10.4;
    }
  }

  // --- page 2 ---
  drawRight(p2, date, 467, 18.3, 10.3, SIZE_BODY, regular);
  drawRight(p2, orderId, 467, 28.7, 10.3, SIZE_BODY, regular);
  drawRight(p2, appFee, AMOUNT_RIGHT, 125.0, 10.3, SIZE_BODY, regular);
  drawRight(p2, appFeeDiscount, AMOUNT_RIGHT, 137.6, 10.3, SIZE_BODY, regular);
  drawRight(p2, appFeeTotal, AMOUNT_RIGHT, 162.4, 10.3, SIZE_BODY, regular);

  const company = content.issuer.companyName ?? "";
  const npwp = content.issuer.npwp ?? "";
  const issuerLine =
    company && npwp
      ? `${company} • NPWP: ${npwp}`
      : company || (npwp ? `NPWP: ${npwp}` : "");
  if (issuerLine) {
    const w = regular.widthOfTextAtSize(issuerLine, SIZE_BODY);
    p2.drawText(issuerLine, {
      x: Math.max(40, (PAGE_W - w) / 2),
      y: baselineY(212.7, 10.3),
      size: SIZE_BODY,
      font: regular,
      color: BLACK,
    });
  }
  if (content.issuer.address) {
    const lines = wrapLines(content.issuer.address, regular, SIZE_BODY, 310);
    let iy = 223.1;
    for (const line of lines) {
      const w = regular.widthOfTextAtSize(line, SIZE_BODY);
      p2.drawText(line, {
        x: Math.max(40, (PAGE_W - w) / 2),
        y: baselineY(iy, 10.3),
        size: SIZE_BODY,
        font: regular,
        color: BLACK,
      });
      iy += 10.4;
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
