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
  .gocar-doc { font-family: Helvetica, Arial, sans-serif; color: #1f2933; background: #fff; }
  .gocar-page { width: 100%; max-width: 760px; margin: 0 auto; min-height: 1040px; background: #fff; }
  .gocar-header { display: flex; justify-content: space-between; align-items: center; background: #00aa6c; color: #fff; padding: 22px 32px; }
  .gocar-brand { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
  .gocar-order { text-align: right; font-size: 13px; line-height: 1.45; }
  .gocar-body { padding: 34px 44px; }
  .gocar-greeting { font-size: 15px; margin-bottom: 4px; }
  .gocar-tagline { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
  .gocar-total-section { text-align: left; margin: 24px 0; }
  .gocar-total-label { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 2px; }
  .gocar-total-amount { color: #00aa6c; font-size: 32px; font-weight: 800; }
  .gocar-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px; margin: 18px 0; }
  .gocar-box-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 10px; }
  .gocar-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; font-size: 13px; }
  .gocar-row.total { border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 14px; font-weight: 800; }
  .gocar-muted { color: #6b7280; }
  .gocar-section-title { font-size: 18px; font-weight: 800; margin: 28px 0 12px; }
  .gocar-trip-driver { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .gocar-trip-vehicle { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
  .gocar-trip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; font-size: 13px; }
  .gocar-trip-grid .gocar-muted { font-size: 11px; display: block; }
  .gocar-trip-location { margin-top: 18px; font-size: 13px; }
  .gocar-trip-location .gocar-muted { font-size: 11px; display: block; }
  .gocar-trip-divider { border: none; border-top: 1px solid #e5e7eb; margin: 14px 0; }
  .gocar-footer { border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 18px; font-size: 11px; color: #6b7280; line-height: 1.55; }
  .gocar-footer-links { display: flex; gap: 24px; margin-bottom: 12px; font-size: 13px; }
  .gocar-footer-links a { color: #00aa6c; text-decoration: none; }
  .gocar-footer-asuransi { margin: 14px 0; }
  .gocar-footer-brand { display: flex; align-items: center; gap: 8px; margin: 12px 0 6px; }
  .gocar-footer-brand span { font-weight: 800; font-size: 15px; color: #1f2933; }
  .gocar-footer-address { font-size: 10px; }
  .gocar-page-break { page-break-before: always; break-before: page; }
  .gocar-faktur-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
  .gocar-ppn-note { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
  .gocar-issuer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 24px; }
  @media (max-width: 640px) { .gocar-body { padding: 24px; } .gocar-trip-grid { grid-template-columns: 1fr; } }
</style>

<!-- ====================== PAGE 1: BUKTI PEMBAYARAN ====================== -->
<div class="gocar-doc">
  <div class="gocar-page">
    {{preview.watermark}}
    <div class="gocar-header">
      <div class="gocar-brand">{{service.name}}</div>
      <div class="gocar-order">
        {{service.orderDate}}<br>ID pesanan: {{service.orderId}}
      </div>
    </div>

    <div class="gocar-body">
      <div class="gocar-greeting">Hai {{customer.name}},</div>
      <div class="gocar-tagline">Makasih udah pesan GoCar</div>

      <!-- Total dibayar -->
      <div class="gocar-total-section">
        <div class="gocar-total-label">Total dibayar</div>
        <div class="gocar-total-amount">{{payment.totalPaid}}</div>
      </div>

      <!-- Rincian pembayaran -->
      <div class="gocar-box">
        <div class="gocar-box-title">Rincian pembayaran</div>
        <div class="gocar-row">
          <span>Biaya perjalanan</span>
          <span>{{payment.tripFee}}</span>
        </div>
        <div class="gocar-row">
          <span>Biaya jasa aplikasi</span>
          <span>{{payment.appFee}}</span>
        </div>
        <div class="gocar-row total">
          <span>Total pembayaran</span>
          <span>{{payment.total}}</span>
        </div>
        <div class="gocar-row">
          <span>Dibayar pakai {{payment.method}}</span>
          <span>{{payment.totalPaid}}</span>
        </div>
      </div>

      <!-- Detail perjalanan -->
      <div class="gocar-section-title">Detail perjalanan</div>
      <div class="gocar-box">
        <div class="gocar-trip-driver">{{trip.driverName}}</div>
        <div class="gocar-trip-vehicle">{{trip.vehiclePlate}} • {{trip.vehicleModel}}</div>

        <div class="gocar-trip-grid">
          <div>
            <span>Jarak {{trip.distance}}</span>
          </div>
          <div>
            <span>Waktu perjalanan {{trip.duration}}</span>
          </div>
        </div>

        <div class="gocar-trip-divider"></div>

        <div class="gocar-trip-location">
          <span class="gocar-muted">Dijemput {{trip.pickupTime}} dari</span>
          <strong>{{trip.pickupName}}</strong>
          <span class="gocar-muted">{{trip.pickupAddress}}</span>
        </div>

        <div class="gocar-trip-location">
          <span class="gocar-muted">Sampai {{trip.dropoffTime}} di</span>
          <strong>{{trip.dropoffName}}</strong>
          <span class="gocar-muted">{{trip.dropoffAddress}}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="gocar-footer">
        <div class="gocar-footer-links">
          <a>Bantuan</a>
          <a>Laporkan masalah</a>
          <a>Tentang GoCar</a>
        </div>
        <div class="gocar-footer-asuransi">
          Perjalanan ini dijamin asuransi. Total yang tercantum adalah harga yang dibayarkan ketika pesanan selesai. Biaya tambahan seperti tip yang diberikan setelah pesanan selesai tidak dicantumkan di bukti pembayaran ini.
        </div>
        <div>Kontak Gojek lewat</div>
        <div class="gocar-footer-brand">
          <span>gojek</span>
        </div>
        <div class="gocar-footer-address">{{issuer.address}}</div>
      </div>
    </div>
    {{preview.meta}}
  </div>

  <!-- ====================== PAGE 2: FAKTUR ====================== -->
  <div class="gocar-page gocar-page-break">
    <div class="gocar-header">
      <div class="gocar-brand">{{service.name}}</div>
      <div class="gocar-order">
        {{service.orderDate}}<br>ID pesanan: {{service.orderId}}
      </div>
    </div>

    <div class="gocar-body">
      <div class="gocar-faktur-title">Faktur</div>
      <div class="gocar-ppn-note">Semua jumlah sudah termasuk PPN</div>

      <!-- App fee breakdown -->
      <div class="gocar-box">
        <div class="gocar-row">
          <span>Biaya jasa aplikasi</span>
          <span>{{payment.appFee}}</span>
        </div>
        <div class="gocar-row">
          <span>Diskon biaya jasa aplikasi</span>
          <span>{{payment.appFeeDiscount}}</span>
        </div>
        <div class="gocar-row total">
          <span>Total biaya jasa aplikasi</span>
          <span>{{payment.total}}</span>
        </div>
      </div>

      <!-- Issuer identity -->
      <div class="gocar-issuer">
        <div>{{issuer.companyName}} • NPWP: {{issuer.npwp}}</div>
        <div>{{issuer.address}}</div>
      </div>
    </div>
  </div>
</div>
`;
