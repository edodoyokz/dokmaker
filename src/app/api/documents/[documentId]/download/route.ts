import { GET as invoiceDownloadGet } from "../../../invoices/[invoiceId]/download/route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  return invoiceDownloadGet(request, {
    params: Promise.resolve({ invoiceId: documentId }),
  });
}
