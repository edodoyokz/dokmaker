import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  // List all templates with usage count
  const before = await prisma.invoiceTemplate.findMany({
    select: {
      id: true,
      name: true,
      documentType: true,
      status: true,
      _count: { select: { invoices: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  console.log("BEFORE:", JSON.stringify(before, null, 2));

  // Only delete templates that have ZERO invoices (safe — never orphan an invoice).
  // The GoCar template (template-gocar-1) is the only canonical template we keep.
  const deleted = await prisma.invoiceTemplate.deleteMany({
    where: {
      id: { not: "template-gocar-1" },
      invoices: { none: {} },
    },
  });
  console.log("DELETED count:", deleted.count);

  const after = await prisma.invoiceTemplate.findMany({
    select: {
      id: true,
      name: true,
      documentType: true,
      status: true,
      _count: { select: { invoices: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  console.log("AFTER:", JSON.stringify(after, null, 2));
} finally {
  await prisma.$disconnect();
}
