import { describe, expect, it } from "vitest";
import { getDefaultGoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";
import { renderDocumentTemplateHtml } from "@/modules/templates/render-template";

const template = `
  <style>.page-break { page-break-before: always; }</style>
  <section>
    {{preview.watermark}}
    <div>{{service.name}}</div>
    <div>{{service.orderDate}}</div>
    <div>{{service.orderId}}</div>
    <div>Hai {{customer.name}},</div>
    <div>{{payment.totalPaid}}</div>
    <div>{{payment.tripFee}}</div>
    <div>{{payment.appFee}}</div>
    <div>{{payment.appFeeDiscount}}</div>
    <div>{{payment.method}}</div>
    <div>{{trip.driverName}}</div>
    <div>{{trip.vehiclePlate}} • {{trip.vehicleModel}}</div>
    <div>{{trip.pickupName}}</div>
    <div>{{trip.dropoffName}}</div>
    <div>{{issuer.companyName}} • NPWP: {{issuer.npwp}}</div>
  </section>
  <section class="page-break">Faktur</section>
`;

describe("GoCar receipt rendering", () => {
  it("renders all GoCar receipt placeholders", () => {
    const html = renderDocumentTemplateHtml({
      htmlTemplate: template,
      documentType: "gocar_receipt",
      content: getDefaultGoCarReceiptContent(),
      mode: "final",
    });

    expect(html).toContain("GoCar");
    expect(html).toContain("RB-4153088-49607870");
    expect(html).toContain("Hai Bernadus Putra,");
    expect(html).toContain("Rp50.000");
    expect(html).toContain("UDIN SAPRUDIN");
    expect(html).toContain("B2036UZX • Toyota Calya");
    expect(html).toContain("Stasiun Gambir");
    expect(html).toContain("NPWP: 0745704361064000");
    expect(html).toContain("page-break");
  });

  it("escapes user editable values", () => {
    const content = getDefaultGoCarReceiptContent();
    content.customer.name = `<script>alert("x")</script>`;
    content.trip.pickupAddress = "A & B < C";

    const html = renderDocumentTemplateHtml({
      htmlTemplate: `{{customer.name}} {{trip.pickupAddress}}`,
      documentType: "gocar_receipt",
      content,
      mode: "final",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("A &amp; B &lt; C");
  });

  it("adds preview watermark only in preview mode", () => {
    const preview = renderDocumentTemplateHtml({
      htmlTemplate: `{{preview.watermark}} {{preview.meta}}`,
      documentType: "gocar_receipt",
      content: getDefaultGoCarReceiptContent(),
      mode: "preview",
      previewMeta: {
        email: "user@example.com",
        timestamp: "2026-06-20T00:00:00.000Z",
        versionId: "version-1",
      },
    });

    const final = renderDocumentTemplateHtml({
      htmlTemplate: `{{preview.watermark}} {{preview.meta}}`,
      documentType: "gocar_receipt",
      content: getDefaultGoCarReceiptContent(),
      mode: "final",
    });

    expect(preview).toContain("PREVIEW");
    expect(preview).toContain("user@example.com");
    expect(final).not.toContain("PREVIEW");
  });
});
