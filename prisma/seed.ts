import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@dokmaker.com" },
    update: {},
    create: {
      email: "admin@dokmaker.com",
      fullName: "Admin DokMaker",
      role: "admin",
      authProvider: "seed",
      authProviderUserId: "seed-admin",
    },
  });

  // Create wallet for admin
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: "test@dokmaker.com" },
    update: {},
    create: {
      email: "test@dokmaker.com",
      fullName: "Test User",
      role: "user",
      authProvider: "seed",
      authProviderUserId: "seed-test",
    },
  });

  // Create wallet for test user
  await prisma.wallet.upsert({
    where: { userId: testUser.id },
    update: {},
    create: { userId: testUser.id },
  });

  // Create active invoice template
  const activeTemplate = await prisma.invoiceTemplate.upsert({
    where: { id: "template-active-1" },
    update: {},
    create: {
      id: "template-active-1",
      name: "Invoice Profesional",
      documentType: "invoice",
      description:
        "Template invoice profesional untuk freelancer dan bisnis kecil.",
      htmlTemplate: `<style>
  .tpl-professional { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 100%; }
  .tpl-professional .tp-header { display: flex; justify-content: space-between; margin-bottom: 32px; border-bottom: 3px solid #1e3a5f; padding-bottom: 16px; }
  .tpl-professional .tp-header-left h1 { font-size: 28px; color: #1e3a5f; margin: 0; letter-spacing: 2px; }
  .tpl-professional .tp-header-left .tp-inv-num { font-size: 13px; color: #666; margin-top: 4px; }
  .tpl-professional .tp-header-right { text-align: right; font-size: 12px; color: #555; line-height: 1.8; }
  .tpl-professional .tp-parties { display: flex; justify-content: space-between; margin-bottom: 28px; }
  .tpl-professional .tp-party { width: 48%; }
  .tpl-professional .tp-party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #1e3a5f; letter-spacing: 1px; margin-bottom: 6px; }
  .tpl-professional .tp-party-name { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
  .tpl-professional .tp-party-detail { font-size: 12px; color: #555; line-height: 1.5; }
  .tpl-professional table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  .tpl-professional th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #1e3a5f; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #1e3a5f; }
  .tpl-professional th.num, .tpl-professional td.num { text-align: right; }
  .tpl-professional td { padding: 10px 8px; border-bottom: 1px solid #e8e8e8; font-size: 12px; }
  .tpl-professional .tp-total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #1e3a5f; border-bottom: none; padding-top: 12px; }
  .tpl-professional .tp-notes { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e8e8e8; }
  .tpl-professional .tp-notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #1e3a5f; letter-spacing: 1px; margin-bottom: 6px; }
  .tpl-professional .tp-notes-text { font-size: 12px; color: #444; line-height: 1.6; white-space: pre-wrap; }
</style>
<div class="tpl-professional">
  {{preview.watermark}}
  <div class="tp-header">
    <div class="tp-header-left">
      <h1>INVOICE</h1>
      <div class="tp-inv-num">{{invoice.number}}</div>
    </div>
    <div class="tp-header-right">
      <div>Tanggal: {{invoice.issueDate}}</div>
      <div>Jatuh Tempo: {{invoice.dueDate}}</div>
    </div>
  </div>
  <div class="tp-parties">
    <div class="tp-party">
      <div class="tp-party-label">Pengirim</div>
      <div class="tp-party-name">{{sender.name}}</div>
      <div class="tp-party-detail">{{sender.address}}</div>
      <div class="tp-party-detail">{{sender.email}}</div>
      <div class="tp-party-detail">{{sender.phone}}</div>
    </div>
    <div class="tp-party">
      <div class="tp-party-label">Klien</div>
      <div class="tp-party-name">{{client.name}}</div>
      <div class="tp-party-detail">{{client.address}}</div>
      <div class="tp-party-detail">{{client.email}}</div>
      <div class="tp-party-detail">{{client.phone}}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Deskripsi</th>
        <th class="num">Qty</th>
        <th class="num">Harga</th>
        <th class="num">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{description}}</td>
        <td class="num">{{quantity}}</td>
        <td class="num">{{unitPrice}}</td>
        <td class="num">{{subtotal}}</td>
      </tr>
      {{/items}}
    </tbody>
    <tfoot>
      <tr class="tp-total-row">
        <td colspan="3">Total</td>
        <td class="num">{{total}}</td>
      </tr>
    </tfoot>
  </table>
  <div class="tp-notes">
    <div class="tp-notes-label">Catatan</div>
    <div class="tp-notes-text">{{notes}}</div>
  </div>
  <div class="tp-notes">
    <div class="tp-notes-label">Instruksi Pembayaran</div>
    <div class="tp-notes-text">{{paymentInstruction}}</div>
  </div>
  {{preview.meta}}
</div>`,
      price: 10000,
      status: "active",
      sortOrder: 1,
    },
  });

  // Create GoCar invoice template
  const gocarTemplate = await prisma.invoiceTemplate.upsert({
    where: { id: "template-gocar-1" },
    update: {},
    create: {
      id: "template-gocar-1",
      name: "GoCar Receipt",
      documentType: "gocar_receipt",
      description:
        "Template bukti pembayaran perjalanan GoCar Prioritas / GoCar Receipt.",
      htmlTemplate: `<style>
  .tpl-gocar { font-family: Helvetica, Arial, sans-serif; color: #222; max-width: 100%; }
  .tpl-gocar .gc-card { border: 2px solid #00aa6c; border-radius: 16px; padding: 24px; max-width: 480px; margin: 0 auto; }
  .tpl-gocar .gc-header { text-align: center; margin-bottom: 20px; }
  .tpl-gocar .gc-header .gc-title { font-size: 22px; font-weight: 800; color: #00aa6c; text-transform: uppercase; letter-spacing: 1px; }
  .tpl-gocar .gc-header .gc-sub { font-size: 12px; color: #888; margin-top: 4px; }
  .tpl-gocar .gc-info { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px; }
  .tpl-gocar .gc-info-label { color: #888; text-transform: uppercase; font-weight: 600; font-size: 10px; letter-spacing: 0.5px; }
  .tpl-gocar .gc-info-value { color: #333; font-weight: 600; }
  .tpl-gocar .gc-divider { border: none; border-top: 1px dashed #e0e0e0; margin: 16px 0; }
  .tpl-gocar .gc-items { margin-bottom: 16px; }
  .tpl-gocar .gc-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
  .tpl-gocar .gc-item-desc { flex: 1; }
  .tpl-gocar .gc-item-detail { color: #888; font-size: 11px; margin: 0 12px; text-align: right; white-space: nowrap; }
  .tpl-gocar .gc-item-subtotal { font-weight: 600; font-family: 'Courier New', monospace; min-width: 80px; text-align: right; }
  .tpl-gocar .gc-total { text-align: center; margin: 20px 0; }
  .tpl-gocar .gc-total-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; }
  .tpl-gocar .gc-total-amount { font-size: 28px; font-weight: 800; color: #00aa6c; font-family: 'Courier New', monospace; }
  .tpl-gocar .gc-footer { font-size: 11px; color: #888; text-align: center; margin-top: 16px; }
</style>
<div class="tpl-gocar">
  {{preview.watermark}}
  <div class="gc-card">
    <div class="gc-header">
      <div class="gc-title">GoCar Receipt</div>
      <div class="gc-sub">{{invoice.number}} &bull; {{invoice.issueDate}}</div>
    </div>
    <div class="gc-info">
      <div>
        <div class="gc-info-label">Pengemudi</div>
        <div class="gc-info-value">{{sender.name}}</div>
      </div>
      <div>
        <div class="gc-info-label">Penumpang</div>
        <div class="gc-info-value">{{client.name}}</div>
      </div>
    </div>
    <hr class="gc-divider">
    <div class="gc-items">
      {{#items}}
      <div class="gc-item">
        <span class="gc-item-desc">{{description}}</span>
        <span class="gc-item-detail">{{quantity}} &times; {{unitPrice}}</span>
        <span class="gc-item-subtotal">{{subtotal}}</span>
      </div>
      {{/items}}
    </div>
    <hr class="gc-divider">
    <div class="gc-total">
      <div class="gc-total-label">Total Pembayaran</div>
      <div class="gc-total-amount">{{total}}</div>
    </div>
    <div class="gc-footer">{{notes}}</div>
    <div class="gc-footer">{{paymentInstruction}}</div>
  </div>
  {{preview.meta}}
</div>`,
      price: 10000,
      status: "active",
      sortOrder: 2,
    },
  });

  // Create inactive invoice template
  await prisma.invoiceTemplate.upsert({
    where: { id: "template-inactive-1" },
    update: {},
    create: {
      id: "template-inactive-1",
      name: "Invoice Minimalis (Draft)",
      documentType: "invoice",
      description: "Template invoice minimalis - belum tersedia.",
      htmlTemplate: `<style>
  .tpl-minimal { font-family: Arial, sans-serif; color: #333; max-width: 100%; }
  .tpl-minimal b { color: #111; }
  .tpl-minimal .tm-section { margin-bottom: 20px; }
  .tpl-minimal .tm-table { width: 100%; }
  .tpl-minimal .tm-table td { padding: 6px 4px; font-size: 13px; }
  .tpl-minimal .tm-table .tm-qty, .tpl-minimal .tm-table .tm-total { text-align: right; }
  .tpl-minimal .tm-line { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
</style>
<div class="tpl-minimal">
  {{preview.watermark}}
  <p><b>INVOICE</b> {{invoice.number}}<br>Tanggal: {{invoice.issueDate}} &bull; Jatuh Tempo: {{invoice.dueDate}}</p>
  <div class="tm-section">
    <p><b>Dari:</b> {{sender.name}}<br>{{sender.address}}<br>{{sender.email}}<br>{{sender.phone}}</p>
    <p><b>Untuk:</b> {{client.name}}<br>{{client.address}}<br>{{client.email}}<br>{{client.phone}}</p>
  </div>
  <table class="tm-table">
    {{#items}}
    <tr>
      <td>{{description}}</td>
      <td class="tm-qty">{{quantity}} x {{unitPrice}}</td>
      <td class="tm-total">{{subtotal}}</td>
    </tr>
    {{/items}}
  </table>
  <hr class="tm-line">
  <p><b>Total: {{total}}</b></p>
  <p>{{notes}}</p>
  <p>{{paymentInstruction}}</p>
  {{preview.meta}}
</div>`,
      price: 10000,
      status: "inactive",
      sortOrder: 3,
    },
  });

  console.log("Seed complete:");
  console.log(`  Admin: ${admin.email} (${admin.id})`);
  console.log(`  Test user: ${testUser.email} (${testUser.id})`);
  console.log(`  Active template: ${activeTemplate.name} (${activeTemplate.id})`);
  console.log(`  GoCar template: ${gocarTemplate.name} (${gocarTemplate.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
