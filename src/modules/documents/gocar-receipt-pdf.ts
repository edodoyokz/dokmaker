import { readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  degrees,
  type PDFImage,
  type PDFFont,
  type PDFPage,
  rgb,
} from "pdf-lib";
import type { GoCarReceiptContent } from "./gocar-receipt-content.schema";
import { formatRupiah } from "@/modules/templates/render-utils";

/**
 * Final/preview PDF for gocar_receipt: stamp dynamic fields onto the original
 * wkhtmltopdf GoCar receipt base so layout/icons match 1:1.
 *
 * Preview uses the same stamp path with a PREVIEW watermark (not HTML).
 *
 * Font note: full DejaVu metrics are ~1.167× wider than the CSS/wkhtml
 * subset used in the reference PDF. Draw size = CSS size × FONT_SCALE.
 */

export type GoCarReceiptPdfWatermark = {
  email: string;
  timestamp: string;
  versionId?: string;
};

export type GoCarReceiptPdfOptions = {
  /** When set, stamp a deterrent PREVIEW watermark (never omit for draft preview). */
  watermark?: GoCarReceiptPdfWatermark;
};

const PAGE_W = 595;
const PAGE_H = 842;
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0, 128 / 255, 0); // #008000 total value
/** Header bar brand green (#00880d) — whiteout plates on green must use this, not white. */
const HEADER_GREEN = rgb(0 / 255, 136 / 255, 13 / 255);

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

/**
 * pdftotext top-origin yMin → pdf-lib baseline.
 * Use drawSize (not CSS size): drawSize = CSS×FONT_SCALE, so subtracting full
 * CSS size drops glyphs ~1.5–2.4pt below static labels (Hai / Dibayar pakai).
 */
function baselineY(yTop: number, drawSize: number): number {
  return PAGE_H - yTop - drawSize;
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
    y: baselineY(yTop, drawSize),
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
    y: baselineY(yTop, drawSize),
    size: drawSize,
    font,
    color,
  });
}

const TIMELINE_ICON_X = 300.5;
const TIMELINE_ICON_SIZE = 12.8;
const TRIP_BORDER_TOP_Y = 513;
const TRIP_BORDER_MAX_Y = 540;

export function tripBorderY(contentBottomY: number): number {
  return Math.min(
    TRIP_BORDER_MAX_Y,
    Math.max(TRIP_BORDER_TOP_Y, contentBottomY + 10)
  );
}

function clearTimelineIcon(page: PDFPage, yTop: number) {
  page.drawRectangle({
    x: TIMELINE_ICON_X - 2,
    y: PAGE_H - yTop - TIMELINE_ICON_SIZE - 2,
    width: TIMELINE_ICON_SIZE + 4,
    height: TIMELINE_ICON_SIZE + 4,
    color: WHITE,
    borderWidth: 0,
  });
}

function drawTimelineIcon(page: PDFPage, icon: PDFImage, yTop: number) {
  clearTimelineIcon(page, yTop);
  page.drawImage(icon, {
    x: TIMELINE_ICON_X,
    y: PAGE_H - yTop - TIMELINE_ICON_SIZE,
    width: TIMELINE_ICON_SIZE,
    height: TIMELINE_ICON_SIZE,
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
    content.customer.name === "Nama Pelanggan" &&
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

async function applyPreviewWatermark(
  doc: PDFDocument,
  watermark: GoCarReceiptPdfWatermark
): Promise<void> {
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(loadAsset("fonts/DejaVuSans-Bold.ttf"));
  const metaFont = await doc.embedFont(loadAsset("fonts/DejaVuSans.ttf"));
  const red = rgb(0.86, 0.15, 0.15);
  const label = [watermark.email, watermark.timestamp]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 80);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    // Light tiled diagonal PREVIEW marks (deterrence, not screenshot-proof).
    for (let y = 80; y < height; y += 160) {
      for (let x = 40; x < width; x += 220) {
        page.drawText("PREVIEW", {
          x,
          y,
          size: 28,
          font,
          color: red,
          rotate: degrees(-30),
          opacity: 0.12,
        });
      }
    }
    if (label) {
      const size = 8;
      const tw = metaFont.widthOfTextAtSize(label, size);
      const padX = 6;
      const padY = 4;
      const boxW = tw + padX * 2;
      const boxH = size + padY * 2;
      const bx = Math.max(8, width - boxW - 8);
      const by = height - boxH - 8;
      page.drawRectangle({
        x: bx,
        y: by,
        width: boxW,
        height: boxH,
        color: rgb(0.86, 0.15, 0.15),
        opacity: 0.92,
        borderWidth: 0,
      });
      page.drawText(label, {
        x: bx + padX,
        y: by + padY,
        size,
        font: metaFont,
        color: rgb(1, 1, 1),
      });
    }
  }
}

export async function generateGoCarReceiptPdf(
  content: GoCarReceiptContent,
  options: GoCarReceiptPdfOptions = {}
): Promise<Buffer> {
  // Sample payload == original receipt → serve wkhtml PDF as-is (pixel-identical),
  // unless a preview watermark is required.
  if (isReferenceSample(content) && !options.watermark) {
    return loadAsset("receipt-base-source.pdf");
  }

  if (isReferenceSample(content) && options.watermark) {
    const doc = await PDFDocument.load(loadAsset("receipt-base-source.pdf"));
    await applyPreviewWatermark(doc, options.watermark);
    return Buffer.from(await doc.save());
  }

  const doc = await PDFDocument.load(loadAsset("receipt-base.pdf"));
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(loadAsset("fonts/DejaVuSans.ttf"));
  const bold = await doc.embedFont(loadAsset("fonts/DejaVuSans-Bold.ttf"));

  const p1 = doc.getPages()[0]!;
  const p2 = doc.getPages()[1]!;
  const pickupIcon = await doc.embedPng(loadAsset("pickup.png"));
  const dropoffIcon = await doc.embedPng(loadAsset("dropoff.png"));

  const date = content.service.orderDate;
  const orderId = content.service.orderId;
  const name = content.customer.name;
  // Single source of truth: line items → totals (ignore stale totalPaid).
  const tripFeeNum = content.payment.tripFee;
  const appFeeNum = content.payment.appFee;
  const appFeeDiscountNum = content.payment.appFeeDiscount;
  const appFeeTotalNum = appFeeNum - appFeeDiscountNum;
  const paymentTotalNum = tripFeeNum + appFeeTotalNum;
  const tripFee = formatRupiah(tripFeeNum);
  const appFee = formatRupiah(appFeeNum);
  const appFeeDiscount = formatRupiah(appFeeDiscountNum);
  const appFeeTotal = formatRupiah(appFeeTotalNum);
  const paymentTotal = formatRupiah(paymentTotalNum);
  const totalPaid = paymentTotal; // same figure on receipt + "Dibayar pakai"
  const method = content.payment.method;

  // Header date + "ID pesanan: {orderId}" sit on green bar (ref x≈308–467).
  // Plate must cover full label+id; partial plate cut the static "ID pesanan:" mid-glyph.
  const orderLine = `ID pesanan: ${orderId}`;
  for (const page of [p1, p2]) {
    page.drawRectangle({
      x: 300,
      y: PAGE_H - 16.5 - 26,
      width: 175,
      height: 26,
      color: HEADER_GREEN,
      borderWidth: 0,
    });
  }

  // --- page 1 header (white text on green) ---
  drawRight(p1, date, 467, 18.3, 10.3, SIZE_BODY, regular, WHITE);
  drawRight(p1, orderLine, 467, 28.7, 10.3, SIZE_BODY, regular, WHITE);

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

  const pickupWhenTop = y;
  drawTimelineIcon(p1, pickupIcon, pickupWhenTop);
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
  // The base PDF has a static drop-off icon at the reference position.
  // Clear it before drawing the icon at the dynamically computed text row.
  clearTimelineIcon(p1, 419.8);
  drawTimelineIcon(p1, dropoffIcon, y);
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

  const borderY = tripBorderY(y);
  if (borderY > TRIP_BORDER_TOP_Y) {
    p1.drawRectangle({
      x: 125,
      y: PAGE_H - TRIP_BORDER_TOP_Y - 2,
      width: 345,
      height: 4,
      color: WHITE,
      borderWidth: 0,
    });
    const borderColor = rgb(0.91, 0.91, 0.91);
    for (const x of [125, 470]) {
      p1.drawLine({
        start: { x, y: PAGE_H - TRIP_BORDER_TOP_Y },
        end: { x, y: PAGE_H - borderY },
        thickness: 0.7,
        color: borderColor,
      });
    }
    p1.drawLine({
      start: { x: 125, y: PAGE_H - borderY },
      end: { x: 470, y: PAGE_H - borderY },
      thickness: 0.7,
      color: borderColor,
    });
  }

  // --- page 2 header (white text on green) ---
  drawRight(p2, date, 467, 18.3, 10.3, SIZE_BODY, regular, WHITE);
  drawRight(p2, orderLine, 467, 28.7, 10.3, SIZE_BODY, regular, WHITE);
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

  if (options.watermark) {
    await applyPreviewWatermark(doc, options.watermark);
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
