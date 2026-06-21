import EditInvoicePage from "@/app/app/invoices/[invoiceId]/edit/page";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  return <EditInvoicePage params={Promise.resolve({ invoiceId: documentId })} />;
}
