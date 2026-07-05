import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const templates = await prisma.invoiceTemplate.findMany({
    select: {
      id: true,
      name: true,
      documentType: true,
      status: true,
      _count: { select: { invoices: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  console.log(JSON.stringify(templates, null, 2));
} finally {
  await prisma.$disconnect();
}
