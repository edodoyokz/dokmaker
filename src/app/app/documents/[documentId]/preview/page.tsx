import PreviewInvoicePage from "@/app/app/invoices/[invoiceId]/preview/page";

export default async function PreviewDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  return <PreviewInvoicePage params={Promise.resolve({ invoiceId: documentId })} />;
}
