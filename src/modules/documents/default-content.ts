import type { InvoiceContent } from "@/modules/invoices/invoice-content.schema";
import { getDefaultGoCarReceiptContent } from "./gocar-receipt-content.schema";

export function getDefaultInvoiceContent(): InvoiceContent {
  return {
    sender: {
      name: "Nama Bisnis Anda",
      address: "Alamat bisnis",
      email: "billing@example.com",
      phone: "081234567890",
    },
    client: {
      name: "Nama Klien",
      address: "Alamat klien",
      email: "client@example.com",
      phone: "081298765432",
    },
    meta: {
      invoiceNumber: "INV-2026-001",
      issueDate: "2026-06-20",
      dueDate: "2026-06-27",
      currency: "IDR",
    },
    items: [
      {
        description: "Jasa profesional",
        quantity: 1,
        unitPrice: 100000,
      },
    ],
    notes: "Terima kasih atas kepercayaannya.",
    paymentInstruction: "Transfer ke rekening yang tertera.",
  };
}

export { getDefaultGoCarReceiptContent };
