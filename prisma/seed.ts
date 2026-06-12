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
      description:
        "Template invoice profesional untuk freelancer dan bisnis kecil.",
      htmlTemplate: "<div>Invoice Template Placeholder</div>",
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
      description:
        "Template bukti pembayaran perjalanan GoCar Prioritas / GoCar Receipt.",
      htmlTemplate: "<div>GoCar Template Placeholder</div>",
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
      description: "Template invoice minimalis - belum tersedia.",
      htmlTemplate: "<div>Invoice Template Placeholder</div>",
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
