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
  /* Negate the generator wrapper body padding so the green header is full-bleed
     and the receipt fits one A4 page (20mm page margins already provide spacing). */
  body {
    padding: 0 !important;
    margin: 0 !important;
  }

  .gocar-doc {
    font-family: Arial, Helvetica, sans-serif;
    color: #000000;            /* Reference uses pure black body text, not gray. */
    background: #ffffff;
    line-height: 1.45;
  }

  .gocar-page {
    box-sizing: border-box;
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    background: #ffffff;
  }

  /* === HEADER === Gojek official green is #00A859 (Asphalt / brand guideline),
     not the darker #097b2f used previously. */
  .gocar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #00a859;       /* Gojek brand green */
    color: #ffffff;
    padding: 16px 24px;
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
    padding: 18px 24px;
  }

  .gocar-greeting {
    font-size: 12.5px;
    color: #000000;            /* Reference: black, not gray */
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
    color: #00a859;            /* brand green for emphasis value */
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

  .gocar-driver-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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
    margin-top: 18px;
    border-top: 1px solid #eeeeee;
    padding-top: 14px;
    text-align: center;
  }

  .gocar-footer-links {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 18px;
    margin-bottom: 10px;
  }

  /* Reference: footer links use brand green, not generic blue. */
  .gocar-footer-link {
    display: flex;
    align-items: center;
    font-size: 11.5px;
    font-weight: 500;
    color: #00a859;            /* brand green */
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
    background-color: #000000; /* filled black circle per reference */
    color: #ffffff;
    border-radius: 50%;
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
      max-width: 100% !important;
      width: 100% !important;
    }
    .gocar-doc {
      background: #ffffff !important;
    }
  }
</style>

<!-- ====================== PAGE 1: BUKTI PEMBAYARAN ====================== -->
<div class="gocar-doc">
  <div class="gocar-page">
    {{preview.watermark}}
    <div class="gocar-header">
      <div class="gocar-logo-area">
        <!-- SVG Front-facing Car Icon -->
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 30px; height: 30px; margin-right: 6px;">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
        <span class="gocar-logo-text"><span style="font-weight: 500;">go</span><span style="font-weight: 800;">car</span></span>
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
      <div class="gocar-card">
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
      <div class="gocar-card" style="margin-top: 0;">
        <div class="gocar-trip-container">

          <!-- LEFT COLUMN: driver + distance/duration -->
          <div class="gocar-trip-left">
            <!-- Driver info row -->
            <div class="gocar-trip-driver">
              <div class="gocar-driver-avatar">
                <!-- Steering wheel icon -->
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 22px; height: 22px; color: #00a859;">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
                  <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
                  <path d="M12 7v2.5M12 14.5V17M5 12h2.5M16.5 12H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M5.5 9l3 1.5M18.5 9l-3 1.5M7 17.5l2.5-3M17 17.5l-2.5-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="gocar-driver-info">
                <div class="gocar-driver-name">{{trip.driverName}}</div>
                <div class="gocar-driver-vehicle">{{trip.vehiclePlate}} • {{trip.vehicleModel}}</div>
              </div>
            </div>

            <!-- Distance & duration meta -->
            <div style="display: flex; align-items: center; margin-top: 12px; font-size: 12px; color: #000000;">
              <!-- Location pin icon -->
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px; color: #00a859; margin-right: 6px; flex-shrink: 0;">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="currentColor"/>
              </svg>
              <span>Jarak {{trip.distance}}</span>
            </div>
            <div style="display: flex; align-items: center; margin-top: 8px; font-size: 12px; color: #000000;">
              <!-- Clock icon -->
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px; color: #00a859; margin-right: 6px; flex-shrink: 0;">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Waktu perjalanan {{trip.duration}}</span>
            </div>
          </div>

          <!-- RIGHT COLUMN: pickup → dropoff timeline -->
          <div class="gocar-trip-right">
            <div class="gocar-timeline">
              <div class="gocar-timeline-line"></div>

              <div class="gocar-timeline-item">
                <div class="gocar-timeline-icon">
                  <!-- Green circle with checkmark (origin) -->
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <circle cx="10" cy="10" r="9" fill="#00a859"/>
                    <path d="M6 10l2.5 2.5L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="gocar-timeline-when">Dijemput {{trip.pickupTime}} dari</div>
                <div class="gocar-timeline-name">{{trip.pickupName}}</div>
                <div class="gocar-timeline-address">{{trip.pickupAddress}}</div>
              </div>

              <div class="gocar-timeline-item">
                <div class="gocar-timeline-icon">
                  <!-- Orange circle with white dot (destination) -->
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <circle cx="10" cy="10" r="9" fill="#ff5c00"/>
                    <circle cx="10" cy="10" r="3.5" fill="white"/>
                  </svg>
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
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; margin-right: 3px;">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
            </svg>
            Bantuan
          </a>
          <a class="gocar-footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; margin-right: 3px;">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
            </svg>
            Laporkan masalah
          </a>
          <a class="gocar-footer-link">
            <!-- White document/page icon SVG inside inherit blue -->
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; margin-right: 3px;">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            Tentang GoCar
          </a>
        </div>
        <p class="gocar-footer-text">
          Perjalanan ini dijamin asuransi. Total yang tercantum adalah harga yang dibayarkan ketika pesanan selesai. Biaya tambahan seperti tip yang diberikan setelah pesanan selesai tidak dicantumkan di bukti pembayaran ini.
        </p>
        <div style="font-size: 10px; color: #666666; margin-bottom: 6px; font-weight: 500;">Kontak Gojek lewat</div>
        <div class="gocar-social-container">
          <span class="gocar-social-icon" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </span>
          <span class="gocar-social-icon" aria-label="X">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </span>
          <span class="gocar-social-icon" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
            </svg>
          </span>
          <span class="gocar-social-icon" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;">
              <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.52 3.5 12 3.5 12 3.5s-7.52 0-9.388.505a3.003 3.003 0 0 0-2.11 2.108C0 8.03 0 12 0 12s0 3.97.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.48 20.5 12 20.5 12 20.5s7.52 0 9.388-.505a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </span>
          <span class="gocar-social-icon" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 15px; height: 15px;">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          </span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; margin: 12px 0 4px;">
          <!-- Gojek Ring Logo -->
          <svg viewBox="0 0 24 24" style="width: 26px; height: 26px; fill: none; margin-right: 5px;">
            <circle cx="12" cy="12" r="8" stroke="#00a859" stroke-width="4"/>
            <circle cx="12" cy="8" r="2.5" fill="#00a859"/>
          </svg>
          <span style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 900; color: #000000; letter-spacing: -1px;">gojek</span>
        </div>
        <div style="font-size: 9.5px; color: #666666; line-height: 1.45; font-weight: 400; max-width: 360px; margin: 0 auto;">
          {{issuer.address}}
        </div>
      </div>
    </div>
    {{preview.meta}}
  </div>

  <!-- ====================== PAGE 2: FAKTUR ====================== -->
  <div class="gocar-page gocar-page-break">
    <div class="gocar-header">
      <div class="gocar-logo-area">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 30px; height: 30px; margin-right: 6px;">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
        <span class="gocar-logo-text"><span style="font-weight: 500;">go</span><span style="font-weight: 800;">car</span></span>
      </div>
      <div class="gocar-header-right">
        <div>{{service.orderDate}}</div>
        <div style="opacity: 0.95;">ID pesanan: {{service.orderId}}</div>
      </div>
    </div>

    <div class="gocar-body">
      <div style="font-size: 24px; font-weight: 700; color: #000000; margin-bottom: 4px;">Faktur</div>
      <div style="font-size: 12px; color: #666666; margin-bottom: 18px;">Semua jumlah sudah termasuk PPN</div>

      <!-- App fee breakdown — card with border per reference -->
      <div class="gocar-card">
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
      <div style="text-align: center; margin-top: 48px;">
        <div style="font-size: 12px; font-weight: 700; color: #000000;">{{issuer.companyName}} • NPWP: {{issuer.npwp}}</div>
        <div style="font-size: 11px; color: #666666; max-width: 480px; margin: 8px auto 0; line-height: 1.5;">{{issuer.address}}</div>
      </div>
    </div>
  </div>
</div>`;
