import { PATCH as invoicePatch } from "../../invoices/[invoiceId]/route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  return invoicePatch(request, {
    params: Promise.resolve({ invoiceId: documentId }),
  });
}
