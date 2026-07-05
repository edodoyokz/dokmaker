import { PrismaClient } from "@prisma/client";
import { GOCAR_RECEIPT_HTML_TEMPLATE } from "../src/modules/documents/gocar-receipt-template.ts";

const prisma = new PrismaClient();

try {
  const result = await prisma.invoiceTemplate.updateMany({
    where: { documentType: "gocar_receipt" },
    data: {
      htmlTemplate: GOCAR_RECEIPT_HTML_TEMPLATE,
      thumbnailUrl: "/templates/gocar-receipt.png",
      status: "active",
    },
  });

  const templates = await prisma.invoiceTemplate.findMany({
    where: { documentType: "gocar_receipt" },
    select: { id: true, name: true, htmlTemplate: true },
  });

  console.log(
    JSON.stringify(
      {
        updated: result.count,
        templates: templates.map((template) => ({
          id: template.id,
          name: template.name,
          synced: template.htmlTemplate === GOCAR_RECEIPT_HTML_TEMPLATE,
          length: template.htmlTemplate.length,
        })),
      },
      null,
      2
    )
  );
} finally {
  await prisma.$disconnect();
}
