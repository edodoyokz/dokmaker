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
          <path d="M17.32 19.04a2 2 0 1 1 0-4 2 2 0 0 1 0 4M6.85 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4m15.64-5.67c0.03 0.3 0.01 1.35-0.02 1.75-0.24 0.91-1 1.57-1.92 1.66l-0.27 0.06c-0.11-1.67-1.5-2.95-3.14-2.89-1.64 0.06-2.93 1.43-2.93 3.1 0 0.1 0.01 0.19 0.01 0.29-0.68 0.01-1.41 0-2.22 0-0.83 0-1.56 0.01-2.22 0 0.01-0.08 0.01-0.19 0.01-0.27 0-1.67-1.28-3.03-2.91-3.11-1.63-0.07-3.02 1.18-3.16 2.85a10.64 10.64 0 0 0-0.29-0.08c-1.35-0.32-1.84-0.94-1.91-1.96-0.05-0.83-0.01-1.67 0.13-2.5 0.11-0.49 0.48-0.89 0.96-1.02 0.33-0.09 0.66-0.15 1-0.21l1.58-2.91a3.83 3.83 0 0 1 3.07-2 28.79 28.79 0 0 1 4.63 0 3.89 3.89 0 0 1 2.96 1.84l1.87 3.02c1.04 0.1 2.08 0.25 3.11 0.45a2.16 2.16 0 0 1 1.66 1.93m-11.04-2.81h4.14l-0.51-0.91-0.7-1.15a1.91 1.91 0 0 0-0.36-0.41 1.48 1.48 0 0 0-0.98-0.36L11.45 7.7v2.82M6.5 8.82l-0.85 1.7h4.14V7.7L8.08 7.69A1.59 1.59 0 0 0 6.66 8.5v0.01L6.5 8.82" fill-rule="evenodd"/>
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
              <path d="M13.28 12.85c0.52-0.64 2.97-1.33 2.97-3.11 0-1.93-2.07-2.74-4.16-2.74-2 0-3.84 1.19-3.84 2.54 0 0.55 0.49 0.83 1.07 0.83 1.59 0 0.77-1.81 2.87-1.81 0.98 0 1.57 0.44 1.57 1.18 0 1.34-2.87 1.71-2.87 3.34 0 0.44 0.34 0.92 1.05 0.92 1.08 0 0.95-0.67 1.34-1.15M12 1.5c5.8 0 10.5 4.7 10.5 10.5S17.8 22.5 12 22.5 1.5 17.8 1.5 12 6.2 1.5 12 1.5m0.44 15.48a0.6 0.6 0 0 0 0.54-0.54c0.03-0.29 0.03-0.59 0-0.88a0.6 0.6 0 0 0-0.54-0.54c-0.29-0.03-0.59-0.03-0.88 0a0.6 0.6 0 0 0-0.54 0.54c-0.03 0.29-0.03 0.59 0 0.88a0.6 0.6 0 0 0 0.54 0.54c0.29 0.03 0.59 0.03 0.88 0" fill-rule="evenodd"/>
            </svg>
            Bantuan
          </a>
          <a class="gocar-footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; margin-right: 3px;">
              <path d="M17.76 6.93l-3.13 3.17a1.04 1.04 0 0 1-1.47 0L10.6 7.51l-2.7 2.75a0.81 0.81 0 0 1-1.16 0 0.85 0.85 0 0 1 0-1.18L9.87 5.9a1.03 1.03 0 0 1 1.47 0l2.55 2.59 2.71-2.75a0.81 0.81 0 0 1 1.16 0c0.32 0.33 0.32 0.86 0 1.19M16 17.2c0 0.44-0.44 0.8-1 0.8-0.55 0-1-0.36-1-0.8v-2.4c0-0.44 0.45-0.8 1-0.8 0.56 0 1 0.36 1 0.8zm-4-0.03c0 0.46-0.44 0.83-1 0.83-0.55 0-1-0.37-1-0.83v-5.84c0-0.46 0.45-0.83 1-0.83 0.56 0 1 0.38 1 0.83v5.84m-4 0C8 17.63 7.56 18 7 18c-0.55 0-1-0.37-1-0.83v-3.34C6 13.37 6.45 13 7 13c0.56 0 1 0.38 1 0.83v3.34m13.77-9.6a6.01 6.01 0 0 0-5.35-5.34 43.23 43.23 0 0 0-8.84 0 6 6 0 0 0-5.35 5.34 42.47 42.47 0 0 0 0 8.86c0.28 2.81 2.52 5.06 5.35 5.35a43.79 43.79 0 0 0 8.84 0 6.01 6.01 0 0 0 5.35-5.35c0.3-2.95 0.3-5.9 0-8.86" fill-rule="evenodd"/>
            </svg>
            Laporkan masalah
          </a>
          <a class="gocar-footer-link">
            <!-- White document/page icon SVG inside inherit blue -->
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; margin-right: 3px;">
              <path d="M12 1.5c5.8 0 10.5 4.7 10.5 10.5S17.8 22.5 12 22.5 1.5 17.8 1.5 12 6.2 1.5 12 1.5m0 8.5a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1m0.44-3.98c-0.29-0.03-0.59-0.03-0.88 0a0.6 0.6 0 0 0-0.54 0.54c-0.03 0.29-0.03 0.59 0 0.88a0.6 0.6 0 0 0 0.54 0.54c0.29 0.03 0.59 0.03 0.88 0a0.6 0.6 0 0 0 0.54-0.54c0.03-0.29 0.03-0.59 0-0.88a0.6 0.6 0 0 0-0.54-0.54" fill-rule="evenodd"/>
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
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;">
              <path d="M8.27 3.06C7.31 3.1 6.66 3.26 6.09 3.48 5.5 3.71 5 4.02 4.5 4.52a4.41 4.41 0 0 0-1.04 1.6C3.24 6.69 3.09 7.35 3.05 8.31 3.01 9.27 3 9.58 3 12.02c0.01 2.44 0.02 2.75 0.06 3.71 0.05 0.96 0.2 1.61 0.43 2.18C3.72 18.5 4.03 19 4.53 19.5s1 0.81 1.59 1.04c0.57 0.22 1.23 0.37 2.19 0.41C9.27 20.99 9.58 21 12.02 21c2.44-0.01 2.75-0.02 3.71-0.06 0.96-0.05 1.61-0.2 2.18-0.43a4.41 4.41 0 0 0 1.59-1.04 4.41 4.41 0 0 0 1.04-1.59c0.22-0.57 0.37-1.23 0.41-2.19 0.04-0.96 0.05-1.27 0.05-3.71-0.01-2.44-0.02-2.75-0.06-3.71-0.05-0.96-0.2-1.61-0.42-2.18a4.42 4.42 0 0 0-1.04-1.59 4.41 4.41 0 0 0-1.6-1.04c-0.57-0.22-1.23-0.37-2.19-0.41C14.73 3.01 14.42 3 11.98 3 9.54 3.01 9.23 3.01 8.27 3.06m0.11 16.27c-0.88-0.04-1.35-0.18-1.67-0.3a2.81 2.81 0 0 1-1.04-0.68 2.8 2.8 0 0 1-0.68-1.03C4.87 17 4.72 16.53 4.68 15.65c-0.04-0.95-0.06-1.23-0.06-3.64 0-2.4 0.01-2.69 0.05-3.63 0.04-0.88 0.18-1.35 0.3-1.67 0.16-0.42 0.36-0.72 0.68-1.04 0.31-0.32 0.61-0.51 1.03-0.68C7 4.87 7.47 4.72 8.35 4.68c0.95-0.04 1.23-0.05 3.64-0.06 2.4 0 2.69 0.01 3.63 0.05 0.88 0.04 1.35 0.18 1.67 0.3 0.42 0.16 0.72 0.36 1.04 0.67 0.32 0.32 0.51 0.61 0.68 1.04 0.12 0.32 0.27 0.79 0.31 1.67 0.04 0.95 0.06 1.23 0.06 3.64 0.01 2.4 0 2.69-0.05 3.63-0.04 0.88-0.18 1.35-0.3 1.67-0.16 0.42-0.36 0.72-0.68 1.04-0.32 0.31-0.61 0.51-1.03 0.68-0.32 0.12-0.79 0.27-1.67 0.31-0.95 0.04-1.23 0.06-3.64 0.06-2.4 0-2.69-0.01-3.63-0.05m7.33-12.14a1.08 1.08 0 1 0 2.16-0.01 1.08 1.08 0 0 0-2.16 0.01m-8.33 4.82a4.62 4.62 0 1 0 9.24-0.02 4.62 4.62 0 0 0-9.24 0.02zm1.62 0A3 3 0 1 1 15 12a3 3 0 0 1-6 0.01"/>
            </svg>
          </span>
          <span class="gocar-social-icon" aria-label="X">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;">
              <path d="M13.12 10.62L19.44 3h-1.5l-5.5 6.62L8.06 3H3l6.64 10.01L3 21h1.5l5.8-6.99L14.94 21H20l-6.88-10.38m-2.05 2.48L5.04 4.17h2.31l10.6 15.72h-2.31l-4.57-6.79v-0.01"/>
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
          <svg viewBox="0 0 24 24" fill="#00a859" style="width: 26px; height: 26px; margin-right: 5px;">
            <path d="M12 2c5.52 0 10 4.51 10 10.06 0 4.17-2.5 7.74-6.14 9.29a1.92 1.92 0 0 1-0.72 0.15 1.87 1.87 0 0 1-1.73-1.16 1.89 1.89 0 0 1 1.01-2.47 6.29 6.29 0 0 0 3.83-5.8c0-3.48-2.8-6.29-6.25-6.3-3.45 0-6.25 2.82-6.25 6.29a6.29 6.29 0 0 0 3.84 5.81c0.69 0.29 1.15 0.98 1.15 1.74 0 1.04-0.84 1.89-1.88 1.89a1.95 1.95 0 0 1-0.72-0.15C4.5 19.8 2 16.24 2 12.07 2 6.51 6.48 2 12 2M8.25 12.07c0-2.08 1.68-3.77 3.75-3.78 2.07 0 3.75 1.69 3.75 3.78 0 2.08-1.68 3.78-3.75 3.77-2.07 0-3.75-1.69-3.75-3.77" fill-rule="evenodd"/>
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
          <path d="M17.32 19.04a2 2 0 1 1 0-4 2 2 0 0 1 0 4M6.85 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4m15.64-5.67c0.03 0.3 0.01 1.35-0.02 1.75-0.24 0.91-1 1.57-1.92 1.66l-0.27 0.06c-0.11-1.67-1.5-2.95-3.14-2.89-1.64 0.06-2.93 1.43-2.93 3.1 0 0.1 0.01 0.19 0.01 0.29-0.68 0.01-1.41 0-2.22 0-0.83 0-1.56 0.01-2.22 0 0.01-0.08 0.01-0.19 0.01-0.27 0-1.67-1.28-3.03-2.91-3.11-1.63-0.07-3.02 1.18-3.16 2.85a10.64 10.64 0 0 0-0.29-0.08c-1.35-0.32-1.84-0.94-1.91-1.96-0.05-0.83-0.01-1.67 0.13-2.5 0.11-0.49 0.48-0.89 0.96-1.02 0.33-0.09 0.66-0.15 1-0.21l1.58-2.91a3.83 3.83 0 0 1 3.07-2 28.79 28.79 0 0 1 4.63 0 3.89 3.89 0 0 1 2.96 1.84l1.87 3.02c1.04 0.1 2.08 0.25 3.11 0.45a2.16 2.16 0 0 1 1.66 1.93m-11.04-2.81h4.14l-0.51-0.91-0.7-1.15a1.91 1.91 0 0 0-0.36-0.41 1.48 1.48 0 0 0-0.98-0.36L11.45 7.7v2.82M6.5 8.82l-0.85 1.7h4.14V7.7L8.08 7.69A1.59 1.59 0 0 0 6.66 8.5v0.01L6.5 8.82" fill-rule="evenodd"/>
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
