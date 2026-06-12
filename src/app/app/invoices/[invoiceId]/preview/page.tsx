import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import InvoicePreview from "@/components/invoices/invoice-preview";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const user = await requireUser();
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId: user.id },
    include: {
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

  const content = activeVersion.contentSnapshot as {
    sender: { name: string; address?: string; email?: string };
    client: { name: string; address?: string; email?: string };
    meta: { invoiceNumber: string; issueDate: string; dueDate?: string; currency: string };
    items: { description: string; quantity: number; unitPrice: number }[];
    notes?: string;
    paymentInstruction?: string;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <InvoicePreview
        content={content}
        isPreview={true}
        previewMeta={{
          email: user.email,
          timestamp: new Date().toISOString(),
          versionId: activeVersion.id,
        }}
      />

      <div className="mx-auto mt-6 max-w-2xl text-center">
        <p className="text-sm text-gray-500">
          Ini adalah preview. Untuk mendapatkan PDF final, lakukan pembayaran.
        </p>
      </div>
    </div>
  );
}
