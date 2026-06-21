import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import { isSupportedDocumentType } from "@/modules/documents/document-type-registry";
import { getDefaultInvoiceContent } from "@/modules/documents/default-content";
import { getDefaultGoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";
import { DocumentCreateForm } from "@/components/documents/document-create-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  await requireUser();
  const { templateId } = await searchParams;

  if (!templateId) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div>
          <Link
            href="/app/templates"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Katalog Template
          </Link>
        </div>
        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Template Belum Dipilih</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Silakan pilih template terlebih dahulu dari katalog template.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const template = await prisma.invoiceTemplate.findUnique({
    where: { id: templateId, status: "active" },
    select: { id: true, name: true, documentType: true },
  });

  if (!template || !isSupportedDocumentType(template.documentType)) {
    notFound();
  }

  const defaultContent =
    template.documentType === "invoice"
      ? getDefaultInvoiceContent()
      : getDefaultGoCarReceiptContent();

  return (
    <DocumentCreateForm
      templateId={template.id}
      templateName={template.name}
      documentType={template.documentType}
      defaultContent={defaultContent}
    />
  );
}
