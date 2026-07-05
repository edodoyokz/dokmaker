import { PrismaClient } from "@prisma/client";
import { GOCAR_RECEIPT_HTML_TEMPLATE } from "../src/modules/documents/gocar-receipt-template";

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

  // Create the canonical GoCar receipt template. This is the only template
  // DokMaker ships; any legacy invoice templates have been removed to avoid
  // stale/drifted render output. The GoCar template is rendered canonically
  // from src/modules/documents/gocar-receipt-template.ts and matches the
  // official Gojek reference receipt 1:1 (see RB-4153088-49607870.pdf).
  const gocarTemplate = await prisma.invoiceTemplate.upsert({
    where: { id: "template-gocar-1" },
    update: {
      documentType: "gocar_receipt",
      htmlTemplate: GOCAR_RECEIPT_HTML_TEMPLATE,
      thumbnailUrl: "/templates/gocar-receipt.png",
      name: "GoCar Receipt",
      description:
        "Template bukti pembayaran perjalanan GoCar Prioritas / GoCar Receipt.",
      price: 10000,
      status: "active",
      sortOrder: 1,
    },
    create: {
      id: "template-gocar-1",
      name: "GoCar Receipt",
      documentType: "gocar_receipt",
      description:
        "Template bukti pembayaran perjalanan GoCar Prioritas / GoCar Receipt.",
      thumbnailUrl: "/templates/gocar-receipt.png",
      htmlTemplate: GOCAR_RECEIPT_HTML_TEMPLATE,
      price: 10000,
      status: "active",
      sortOrder: 1,
    },
  });

  console.log("Seed complete:");
  console.log(`  Admin: ${admin.email} (${admin.id})`);
  console.log(`  Test user: ${testUser.email} (${testUser.id})`);
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
