import { GOCAR_RECEIPT_ASSETS } from "./gocar-receipt-assets";

/**
 * Two-page GoCar Receipt HTML template.
 *
 * Page 1 — Bukti Pembayaran (receipt): header + greeting + total + payment
 *          breakdown + trip details + footer.
 * Page 2 — Faktur (tax invoice): app fee breakdown + issuer identity.
 *
 * Placeholders are resolved by buildGoCarReceiptRenderContext() and the
 * shared preview watermark/meta injection in render-template.ts.
 */
export const GOCAR_RECEIPT_HTML_TEMPLATE = `<style>
  @font-face {
    font-family: "GoCar DejaVu Sans";
    src: url("${GOCAR_RECEIPT_ASSETS.fontRegular}") format("woff2");
    font-style: normal;
    font-weight: 400;
    font-display: block;
  }

  @font-face {
    font-family: "GoCar DejaVu Sans";
    src: url("${GOCAR_RECEIPT_ASSETS.fontBold}") format("woff2");
    font-style: normal;
    font-weight: 700 900;
    font-display: block;
  }

  /* A4 page geometry — full-bleed (no printer margin). The PDF generator
     sets preferCSSPageSize + zero margin, so @page is authoritative.
     Reference green bar is 127mm wide (x=326..1325px @200dpi) with ~41.4mm
     L/R margins, NOT full-bleed edge-to-edge. */
  @page {
    size: A4;
    margin: 0;
  }

  html, body {
    padding: 0 !important;
    margin: 0 !important;
  }

  .gocar-doc {
    font-family: "GoCar DejaVu Sans", "DejaVu Sans", sans-serif;
    color: #000000;            /* Reference uses pure black body text, not gray. */
    background: #ffffff;
    line-height: 1.45;
  }

  .gocar-page {
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    background: #ffffff;
    padding: 0 41.4mm;         /* matches reference green bar L/R margins */
  }

  /* === HEADER === Gojek official green is #00880D (Asphalt / brand guideline).
     The green bar extends to the edge of its container (gocar-page padding
     already provides the 41.4mm inset). Header height in reference: 159px =
     20.19mm @200dpi. */
  .gocar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #00880d;       /* Gojek brand green (wkhtmltopdf rendered) */
    color: #ffffff;
    padding: 21px 0;           /* vertical-only; horizontal handled by .gocar-page */
  }

  .gocar-logo-area {
    display: flex;
    align-items: center;
    color: #ffffff;            /* ensure SVG inherits white */
  }

  .gocar-logo-text {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -1.2px;
    color: #ffffff;
  }

  .gocar-header-right {
    text-align: right;
    font-size: 10px;
    line-height: 1.4;
  }

  .gocar-body {
    padding: 18px 3.7mm;       /* body content total inset: 41.4mm (page) + 3.7mm ≈ 45.1mm ≈ 127.88pt (ref) */
  }

  .gocar-greeting {
    font-size: 12.5px;
    color: #000000;
    margin-bottom: 2px;
    font-weight: 500;
  }

  .gocar-thanks {
    font-size: 18px;
    font-weight: 700;
    color: #000000;
    margin-bottom: 14px;
  }

  /* === TOTAL BAR === Reference uses a soft gray panel, not tinted blue. */
  .gocar-total-bar {
    background-color: #f5f5f5; /* neutral light gray */
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    margin-bottom: 14px;
  }

  .gocar-total-title {
    font-size: 12px;
    font-weight: 600;
    color: #000000;
  }

  .gocar-total-val {
    font-size: 17px;
    font-weight: 700;
    color: #008000;            /* reference total value green (wkhtml render) */
  }

  .gocar-section-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #000000;
    margin-top: 14px;
    margin-bottom: 8px;
  }

  .gocar-flat-section {
    background-color: #ffffff;
    padding: 0;
    margin-bottom: 12px;
  }

  .gocar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #333333;            /* Reference: dark gray body, not #4b5563 */
    padding: 6px 0;
    border-bottom: 1px solid #eeeeee;
  }

  .gocar-flat-section .gocar-row:last-child {
    border-bottom: none;
  }

  .gocar-row-total {
    font-weight: 700;
    color: #000000;
    border-top: 1.5px solid #e0e0e0;
    border-bottom: 1.5px solid #e0e0e0;
    padding: 8px 0;
    margin-top: 2px;
  }

  /* === CARDS === used sparingly; reference page 2 is flat, not boxed. */
  .gocar-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #ffffff;
    padding: 12px 14px;
    margin-bottom: 12px;
  }

  /* === TRIP DETAILS === Reference uses a 2-column grid:
     left = driver + distance/duration, right = pickup→dropoff timeline. */
  .gocar-trip-container {
    display: grid;
    grid-template-columns: 42% 58%;
    gap: 16px;
  }

  .gocar-trip-left {
    display: flex;
    flex-direction: column;
  }

  .gocar-trip-right {
    display: flex;
    flex-direction: column;
  }

  .gocar-trip-driver {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .gocar-driver-info {
    display: flex;
    flex-direction: column;
  }

  .gocar-driver-name {
    font-size: 13px;
    font-weight: 700;
    color: #000000;
    text-transform: uppercase;  /* Reference: driver name shown in CAPS */
    letter-spacing: 0.3px;
  }

  .gocar-driver-vehicle {
    font-size: 11px;
    color: #666666;
  }

  .gocar-trip-meta {
    display: flex;
    gap: 16px;
    padding: 8px 0;
    border-top: 1px solid #eeeeee;
    border-bottom: 1px solid #eeeeee;
  }

  .gocar-trip-meta-item {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #000000;
  }

  .gocar-timeline {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px 0;
  }

  .gocar-timeline-line {
    position: absolute;
    left: 9px;
    top: 20px;
    bottom: 20px;
    width: 2px;
    background-color: #e0e0e0;
    z-index: 1;
  }

  .gocar-timeline-item {
    position: relative;
    padding-left: 28px;
    z-index: 2;
  }

  .gocar-timeline-icon {
    position: absolute;
    left: 0;
    top: 2px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffffff;
  }

  /* Pickup/dropoff label format per reference:
     Single line "Dijemput {date} pukul {time} dari" then bold place name, then address. */
  .gocar-timeline-when {
    font-size: 11px;
    color: #666666;
    line-height: 1.3;
    margin-bottom: 2px;
  }

  .gocar-timeline-name {
    font-size: 12.5px;
    font-weight: 700;
    color: #000000;
    line-height: 1.3;
    margin-bottom: 2px;
  }

  .gocar-timeline-address {
    font-size: 10.5px;
    color: #666666;
    line-height: 1.4;
  }

  .gocar-footer {
    margin-top: 10px;
    border-top: 1px solid #eeeeee;
    padding-top: 10px;
    text-align: center;
  }

  .gocar-footer-links {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 8px;
  }

  /* Reference: footer links are black + underline (not brand green / browser blue). */
  .gocar-footer-link {
    display: flex;
    align-items: center;
    font-size: 11.5px;
    font-weight: 500;
    color: #000000;
    text-decoration: underline;
    cursor: pointer;
  }

  .gocar-footer-text {
    font-size: 9.5px;
    color: #666666;            /* Reference footer text uses #666 */
    line-height: 1.45;
    max-width: 600px;
    margin: 0 auto 10px;
  }

  /* === SOCIAL ICONS === Reference uses bare black icons (no filled circle background). */
  .gocar-social-container {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .gocar-social-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .gocar-page-break {
    page-break-before: always;
    break-before: page;
  }

  @media print {
    body {
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff;
    }
    .gocar-page {
      box-shadow: none !important;
      margin: 0 !important;
      border-radius: 0 !important;
      width: 100% !important;
    }
    .gocar-doc {
      background: #ffffff !important;
    }
  }

  /* Pixel-parity overrides measured from the supplied 1240x1755 reference
     pages at 150 DPI. CSS pixels render at 1.5625 output pixels. */
  html, body,
  .gocar-doc,
  .gocar-page {
    background: #fafafa;
  }

  .gocar-doc {
    line-height: 1.45;
  }

  .gocar-page {
    min-height: 297mm;
    padding: 0 41.54mm;
  }

  .gocar-header {
    box-sizing: border-box;
    height: 76px;
    padding: 0 14px;
  }

  .gocar-logo-image {
    display: block;
    width: 160px;
    height: 46px;
    object-fit: contain;
  }

  .gocar-header-right {
    font-size: 13px;
    line-height: 1.1;
  }

  .gocar-body {
    background: #ffffff;
    padding: 28px 10px 0;
  }

  .gocar-greeting {
    font-size: 14px;
    margin: 0 4px 13px;
  }

  .gocar-thanks {
    font-size: 18px;
    margin: 0 4px 25.4px;
  }

  .gocar-total-bar {
    box-sizing: border-box;
    width: 336px;
    height: 37px;
    margin: 0 auto;
    padding: 0 21px;
    border: 1px solid #e8e8e8;
    border-radius: 0;
    background: #fafafa;
  }

  .gocar-total-title {
    font-size: 16px;
    font-weight: 700;
  }

  .gocar-total-val {
    font-size: 16px;
  }

  .gocar-section-title {
    font-size: 15px;
    margin: 23px 3px 8.5px;
    transform: translateY(-1px);
  }

  .gocar-card {
    box-sizing: border-box;
    border-color: #e8e8e8;
    border-radius: 0;
    padding: 15px 14px;
    margin-bottom: 12px;
  }

  .gocar-payment-card {
    min-height: 110.5px; /* ponytail: was fixed height; clips long labels */
    padding-top: 11.2px;
    padding-bottom: 11.2px;
  }

  .gocar-row {
    min-height: 17px;
    padding: 0;
    border-bottom: 0;
    font-size: 13px;
    line-height: 17px;
  }

  .gocar-row-total {
    margin-top: 10px;
    padding-top: 5px;
    border-top: 1px solid #a6a6a6;
    border-bottom: 0;
  }

  /* Best pixel match: 2-col — left driver+meta, right timeline. */
  .gocar-trip-card {
    min-height: 0;
    padding: 12px 22px 10px;
    border-bottom: 0;
  }

  .gocar-trip-container {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    align-items: start;
    margin-top: 0;
  }

  .gocar-trip-driver {
    align-items: flex-start;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .gocar-trip-meta-list {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #e8e8e8;
  }

  .gocar-trip-meta-row {
    display: flex;
    align-items: center;
    margin-top: 6px;
    font-size: 12px;
    color: #000000;
  }

  .gocar-trip-meta-row:first-child {
    margin-top: 0;
  }

  .gocar-driver-name {
    font-size: 14px;
    line-height: 1.05;
  }

  .gocar-driver-vehicle {
    font-size: 14px;
    line-height: 1.3;
    color: #000000;
  }

  .gocar-trip-meta-icon {
    display: block;
    width: 12.8px;
    height: 12.8px;
    margin-right: 6px;
    flex-shrink: 0;
  }

  .gocar-timeline {
    gap: 18px;
    padding: 0;
  }

  .gocar-timeline-line {
    display: none;
  }

  .gocar-timeline-item {
    padding-left: 16px;
  }

  .gocar-timeline-icon,
  .gocar-timeline-icon img {
    width: 12.8px !important;
    height: 12.8px !important;
  }

  .gocar-timeline-icon {
    top: 2px;
  }

  .gocar-timeline-when,
  .gocar-timeline-name,
  .gocar-timeline-address {
    color: #000000;
    font-size: 12.5px;
    line-height: 1.2;
    margin-bottom: 1px;
  }

  .gocar-timeline-name {
    font-size: 13.5px;
  }

  /* Ref wraps: "Dijemput 11 Juni 2026 jam" then "15:25 dari" */
  .gocar-timeline-when {
    max-width: 168px;
  }

  .gocar-trip-right {
    transform: none;
    width: 100%;
  }

  .gocar-timeline-address {
    margin-top: 2px;
    margin-bottom: 0;
    max-width: 190px;
  }

  .gocar-timeline-item + .gocar-timeline-item .gocar-timeline-name {
    margin-top: 2px;
  }

  .gocar-footer {
    margin: 18px calc(-41.54mm - 10px) 0;
    padding: 20px 0 22px;
    border: 0;
    background: #fafafa;
  }

  .gocar-footer-links {
    gap: 42px;
    margin-bottom: 16px;
  }

  .gocar-footer-link {
    color: #000000; /* reference footer links are black */
    font-size: 13px;
    font-weight: 400;
  }

  .gocar-footer-link img {
    display: block;
    width: 11.2px;
    height: 11.2px;
    margin-right: 4px;
  }

  .gocar-footer-text {
    max-width: 400px;
    margin: 0 auto 28px;
    color: #000000;
    font-size: 11px;
    line-height: 1.25;
  }

  .gocar-contact-label {
    margin-bottom: 12px;
    color: #000000;
    font-size: 11.5px;
    font-weight: 400;
  }

  .gocar-social-container {
    gap: 18px;
    margin-bottom: 0;
  }

  .gocar-social-icon {
    width: 22.5px;
    height: 22.5px;
  }

  .gocar-social-icon img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .gocar-brand-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 30px 0 14px;
  }

  .gocar-gojek-logo {
    display: block;
    width: 81.6px;
    height: 24px;
    object-fit: contain;
  }

  .gocar-footer-address {
    max-width: 360px;
    margin: 0 auto;
    color: #000000;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.15;
  }

  .gocar-faktur-title {
    margin-bottom: 14px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
  }

  .gocar-faktur-subtitle {
    margin-bottom: 8px;
    color: #000000;
    font-size: 13px;
  }

  .gocar-faktur-card {
    min-height: 93px; /* ponytail: was fixed height */
    padding-top: 11px;
    padding-bottom: 11px;
  }

  .gocar-issuer {
    margin: 11px calc(-41.54mm - 10px) 0;
    padding-top: 26px;
    min-height: 74px;
    background: #fafafa;
    text-align: center;
  }

  .gocar-issuer-name {
    color: #000000;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.15;
  }

  .gocar-issuer-address {
    max-width: 480px;
    margin: 0 auto;
    color: #000000;
    font-size: 13px;
    line-height: 1.05;
  }

  .gocar-page-break .gocar-body {
    padding-top: 15px;
  }

  .gocar-page-break {
    background: linear-gradient(
      to bottom,
      #fafafa 0 332.8px,
      #ffffff 332.8px 100%
    );
  }

  @media print {
    .gocar-doc {
      background: #fafafa !important;
    }
  }
</style>

<!-- ====================== PAGE 1: BUKTI PEMBAYARAN ====================== -->
<div class="gocar-doc">
  <div class="gocar-page" data-gocar-page="1">
    {{preview.watermark}}
    <div class="gocar-header">
      <div class="gocar-logo-area">
        <img class="gocar-logo-image" src="${GOCAR_RECEIPT_ASSETS.logo}" alt="GoCar" />
      </div>
      <div class="gocar-header-right">
        <div>{{service.orderDate}}</div>
        <div style="opacity: 0.95;">ID pesanan: {{service.orderId}}</div>
      </div>
    </div>

    <div class="gocar-body">
      <div class="gocar-greeting">Hai {{customer.name}},</div>
      <div class="gocar-thanks">Makasih udah pesan GoCar</div>

      <!-- Total dibayar -->
      <div class="gocar-total-bar">
        <span class="gocar-total-title">Total dibayar</span>
        <span class="gocar-total-val">{{payment.totalPaid}}</span>
      </div>

      <!-- Rincian pembayaran -->
      <div class="gocar-section-title">Rincian pembayaran</div>
      <div class="gocar-card gocar-payment-card">
        <div class="gocar-row">
          <span>Biaya perjalanan</span>
          <span>{{payment.tripFee}}</span>
        </div>
        <div class="gocar-row">
          <span>Biaya jasa aplikasi</span>
          <span>{{payment.appFee}}</span>
        </div>
        <div class="gocar-row gocar-row-total">
          <span>Total pembayaran</span>
          <span>{{payment.total}}</span>
        </div>
        <div class="gocar-row" style="color: #333333; border-bottom: none;">
          <span>Dibayar pakai {{payment.method}}</span>
          <span>{{payment.totalPaid}}</span>
        </div>
      </div>

      <!-- Detail perjalanan -->
      <div class="gocar-section-title">Detail perjalanan</div>
      <div class="gocar-card gocar-trip-card" style="margin-top: 0;">
        <div class="gocar-trip-container">
          <div class="gocar-trip-left">
            <div class="gocar-trip-driver">
              <div class="gocar-driver-info">
                <div class="gocar-driver-name">{{trip.driverName}}</div>
                <div class="gocar-driver-vehicle">{{trip.vehiclePlate}} • {{trip.vehicleModel}}</div>
              </div>
            </div>
            <div class="gocar-trip-meta-list">
              <div class="gocar-trip-meta-row">
                <img class="gocar-trip-meta-icon" src="${GOCAR_RECEIPT_ASSETS.tripDistance}" alt="" />
                <span>Jarak {{trip.distance}}</span>
              </div>
              <div class="gocar-trip-meta-row">
                <img class="gocar-trip-meta-icon" src="${GOCAR_RECEIPT_ASSETS.tripDuration}" alt="" />
                <span>Waktu perjalanan {{trip.duration}}</span>
              </div>
            </div>
          </div>
          <div class="gocar-trip-right">
            <div class="gocar-timeline">
              <div class="gocar-timeline-line"></div>
              <div class="gocar-timeline-item">
                <div class="gocar-timeline-icon">
                  <img src="${GOCAR_RECEIPT_ASSETS.pickup}" alt="" />
                </div>
                <div class="gocar-timeline-when">Dijemput {{trip.pickupTime}} dari</div>
                <div class="gocar-timeline-name">{{trip.pickupName}}</div>
                <div class="gocar-timeline-address">{{trip.pickupAddress}}</div>
              </div>
              <div class="gocar-timeline-item">
                <div class="gocar-timeline-icon">
                  <img src="${GOCAR_RECEIPT_ASSETS.dropoff}" alt="" />
                </div>
                <div class="gocar-timeline-when">Sampai {{trip.dropoffTime}} di</div>
                <div class="gocar-timeline-name">{{trip.dropoffName}}</div>
                <div class="gocar-timeline-address">{{trip.dropoffAddress}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="gocar-footer">
        <div class="gocar-footer-links">
          <a class="gocar-footer-link">
            <img src="${GOCAR_RECEIPT_ASSETS.help}" alt="" />
            Bantuan
          </a>
          <a class="gocar-footer-link">
            <img src="${GOCAR_RECEIPT_ASSETS.report}" alt="" />
            Laporkan masalah
          </a>
          <a class="gocar-footer-link">
            <img src="${GOCAR_RECEIPT_ASSETS.about}" alt="" />
            Tentang GoCar
          </a>
        </div>
        <p class="gocar-footer-text">
          Perjalanan ini dijamin asuransi. Total yang tercantum adalah harga yang dibayarkan ketika pesanan selesai. Biaya tambahan seperti tip yang diberikan setelah pesanan selesai tidak dicantumkan di bukti pembayaran ini.
        </p>
        <div class="gocar-contact-label">Kontak Gojek lewat</div>
        <div class="gocar-social-container">
          <span class="gocar-social-icon" aria-label="Instagram">
            <img src="${GOCAR_RECEIPT_ASSETS.instagram}" alt="" />
          </span>
          <span class="gocar-social-icon" aria-label="Twitter">
            <img src="${GOCAR_RECEIPT_ASSETS.twitter}" alt="" />
          </span>
          <span class="gocar-social-icon" aria-label="Facebook">
            <img src="${GOCAR_RECEIPT_ASSETS.facebook}" alt="" />
          </span>
          <span class="gocar-social-icon" aria-label="YouTube">
            <img src="${GOCAR_RECEIPT_ASSETS.youtube}" alt="" />
          </span>
          <span class="gocar-social-icon" aria-label="LinkedIn">
            <img src="${GOCAR_RECEIPT_ASSETS.linkedin}" alt="" />
          </span>
        </div>
        <div class="gocar-brand-footer">
          <img class="gocar-gojek-logo" src="${GOCAR_RECEIPT_ASSETS.gojekLogo}" alt="Gojek" />
        </div>
        <div class="gocar-footer-address">
          Pasaraya Blok M GD B, 7th Floor, Kebayoran Baru, DKI Jakarta Indonesia 12160
        </div>
      </div>
    </div>
    {{preview.meta}}
  </div>

  <!-- ====================== PAGE 2: FAKTUR ====================== -->
  <div class="gocar-page gocar-page-break" data-gocar-page="2">
    <div class="gocar-header">
      <div class="gocar-logo-area">
        <img class="gocar-logo-image" src="${GOCAR_RECEIPT_ASSETS.logo}" alt="GoCar" />
      </div>
      <div class="gocar-header-right">
        <div>{{service.orderDate}}</div>
        <div style="opacity: 0.95;">ID pesanan: {{service.orderId}}</div>
      </div>
    </div>

    <div class="gocar-body">
      <div class="gocar-faktur-title">Faktur</div>
      <div class="gocar-faktur-subtitle">Semua jumlah sudah termasuk PPN</div>

      <!-- App fee breakdown — card with border per reference -->
      <div class="gocar-card gocar-faktur-card">
        <div class="gocar-row">
          <span>Biaya jasa aplikasi</span>
          <span>{{payment.appFee}}</span>
        </div>
        <div class="gocar-row">
          <span>Diskon biaya jasa aplikasi</span>
          <span>{{payment.appFeeDiscount}}</span>
        </div>
        <div class="gocar-row gocar-row-total">
          <span>Total biaya jasa aplikasi</span>
          <span>{{payment.appFeeTotal}}</span>
        </div>
      </div>

      <!-- Issuer identity -->
      <div class="gocar-issuer">
        <div class="gocar-issuer-name">{{issuer.companyName}} • NPWP: {{issuer.npwp}}</div>
        <div class="gocar-issuer-address">{{issuer.address}}</div>
      </div>
    </div>
  </div>
</div>`;
