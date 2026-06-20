import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import PreviewClient from "./preview-client";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const user = await requireUser();
  const { invoiceId } = await params;

  // Fetch invoice details with active version
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId: user.id },
    include: {
      template: true,
      versions: {
        orderBy: { versionNumber: "desc" as const },
      },
    },
  });

  if (!invoice || !invoice.activeVersionId) {
    notFound();
  }

  const activeVersion = invoice.versions.find(
    (v) => v.id === invoice.activeVersionId
  );

  if (!activeVersion) {
    notFound();
  }

  // Fetch user wallet balance
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  return (
    <PreviewClient
      invoiceId={invoice.id}
      invoiceNumber={invoice.invoiceNumber}
      documentType={invoice.documentType as string}
      title={invoice.title}
      initialStatus={activeVersion.status}
      initialBalance={wallet?.currentBalance ?? 0}
      content={activeVersion.contentSnapshot as unknown}
      htmlTemplate={invoice.template.htmlTemplate}
      previewMeta={{
        email: user.email,
        timestamp: new Date(activeVersion.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        versionId: activeVersion.id,
      }}
    />
  );
}
