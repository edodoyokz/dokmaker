import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Deskripsi item wajib diisi"),
  quantity: z.number().positive("Jumlah harus lebih dari 0"),
  unitPrice: z.number().nonnegative("Harga satuan tidak boleh negatif"),
});

export const invoiceContentSchema = z.object({
  sender: z.object({
    name: z.string().min(1, "Nama pengirim wajib diisi"),
    address: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  client: z.object({
    name: z.string().min(1, "Nama klien wajib diisi"),
    address: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  meta: z.object({
    invoiceNumber: z.string().min(1, "Nomor invoice wajib diisi"),
    issueDate: z.string().min(1, "Tanggal invoice wajib diisi"),
    dueDate: z.string().optional(),
    currency: z.string().default("IDR"),
  }),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Minimal 1 item diperlukan"),
  notes: z.string().optional(),
  paymentInstruction: z.string().optional(),
  gocar: z
    .object({
      driverName: z.string().optional(),
      vehiclePlate: z.string().optional(),
      vehicleType: z.string().optional(),
      distance: z.string().optional(),
      duration: z.string().optional(),
      pickupTime: z.string().optional(),
      pickupLocationName: z.string().optional(),
      pickupAddress: z.string().optional(),
      dropoffTime: z.string().optional(),
      dropoffLocationName: z.string().optional(),
      dropoffAddress: z.string().optional(),
      paymentMethod: z.string().optional(),
      serviceFeeDiscount: z.number().optional(),
    })
    .optional(),
});

export type InvoiceContent = z.infer<typeof invoiceContentSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

/**
 * Calculate total for an invoice content
 */
export function calculateInvoiceTotal(content: InvoiceContent): number {
  return content.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
}
