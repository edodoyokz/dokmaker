interface Props {
  content: {
    sender: { name: string; address?: string; email?: string; phone?: string };
    client: { name: string; address?: string; email?: string; phone?: string };
    meta: { invoiceNumber: string; issueDate: string; dueDate?: string; currency: string };
    items: { description: string; quantity: number; unitPrice: number }[];
    notes?: string;
    paymentInstruction?: string;
  };
  isPreview?: boolean;
  previewMeta?: {
    email: string;
    timestamp: string;
    versionId: string;
  };
}

export default function InvoicePreview({ content, isPreview, previewMeta }: Props) {
  const total = content.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="relative mx-auto max-w-2xl bg-white p-8 shadow-lg">
      {/* Watermark for preview */}
      {isPreview && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rotate-[-30deg] text-6xl font-bold text-gray-200 opacity-30">
            PREVIEW
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
          <p className="mt-1 text-sm text-gray-500">
            {content.meta.invoiceNumber}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            Tanggal: {content.meta.issueDate}
          </p>
          {content.meta.dueDate && (
            <p className="text-sm text-gray-500">
              Jatuh Tempo: {content.meta.dueDate}
            </p>
          )}
        </div>
      </div>

      {/* Sender & Client */}
      <div className="mb-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">
            Pengirim
          </p>
          <p className="mt-1 font-medium">{content.sender.name}</p>
          {content.sender.address && (
            <p className="text-sm text-gray-600">{content.sender.address}</p>
          )}
          {content.sender.email && (
            <p className="text-sm text-gray-600">{content.sender.email}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">
            Klien
          </p>
          <p className="mt-1 font-medium">{content.client.name}</p>
          {content.client.address && (
            <p className="text-sm text-gray-600">{content.client.address}</p>
          )}
          {content.client.email && (
            <p className="text-sm text-gray-600">{content.client.email}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="mb-8 w-full">
        <thead>
          <tr className="border-b text-left text-sm text-gray-500">
            <th className="pb-2">Deskripsi</th>
            <th className="pb-2 text-right">Qty</th>
            <th className="pb-2 text-right">Harga</th>
            <th className="pb-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {content.items.map((item, index) => (
            <tr key={index} className="border-b">
              <td className="py-3">{item.description}</td>
              <td className="py-3 text-right">{item.quantity}</td>
              <td className="py-3 text-right">
                Rp{item.unitPrice.toLocaleString("id-ID")}
              </td>
              <td className="py-3 text-right">
                Rp{(item.quantity * item.unitPrice).toLocaleString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={3} className="pt-3 text-right">
              Total
            </td>
            <td className="pt-3 text-right">
              Rp{total.toLocaleString("id-ID")}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {content.notes && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase text-gray-400">
            Catatan
          </p>
          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
            {content.notes}
          </p>
        </div>
      )}

      {/* Payment Instruction */}
      {content.paymentInstruction && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">
            Instruksi Pembayaran
          </p>
          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
            {content.paymentInstruction}
          </p>
        </div>
      )}

      {/* Preview meta */}
      {isPreview && previewMeta && (
        <div className="mt-8 border-t pt-4 text-xs text-gray-400">
          <p>Preview only • {previewMeta.email}</p>
          <p>Generated: {previewMeta.timestamp}</p>
          <p>Version: {previewMeta.versionId}</p>
        </div>
      )}
    </div>
  );
}
