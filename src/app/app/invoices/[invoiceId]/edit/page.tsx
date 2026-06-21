import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isSupportedDocumentType } from "@/modules/documents/document-type-registry";
import type { DocumentType } from "@/modules/documents/types";
import InvoiceEditForm from "./edit-form";
import Link from "next/link";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const user = await requireUser();
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId: user.id },
    include: {
      template: true,
      versions: {
        orderBy: { versionNumber: "desc" as const },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const activeVersion = invoice.versions.find(
    (v) => v.id === invoice.activeVersionId
  );

  if (!activeVersion) {
    notFound();
  }

  if (!isSupportedDocumentType(invoice.documentType)) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/app/invoices"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Kembali ke Invoice
        </Link>
        <Link
          href={`/app/invoices/${invoiceId}/preview`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
        >
          Preview
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{invoice.title || invoice.invoiceNumber || "Dokumen"}</h1>
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            activeVersion.status === "paid"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {activeVersion.status === "paid" ? "Sudah Bayar" : "Belum Bayar"}
        </span>
        <span className="text-sm text-gray-400">
          v{activeVersion.versionNumber}
        </span>
      </div>

      <InvoiceEditForm
        invoiceId={invoiceId}
        documentType={invoice.documentType as DocumentType}
        content={activeVersion.contentSnapshot}
      />
    </div>
  );
}
