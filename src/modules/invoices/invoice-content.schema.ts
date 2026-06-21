import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z
    .string()
    .min(1, "Deskripsi item wajib diisi")
    .max(1000, "Deskripsi item maksimal 1000 karakter"),
  quantity: z.number().positive("Jumlah harus lebih dari 0"),
  unitPrice: z.number().nonnegative("Harga satuan tidak boleh negatif"),
});

export const invoiceContentSchema = z.object({
  sender: z.object({
    name: z
      .string()
      .min(1, "Nama pengirim wajib diisi")
      .max(200, "Nama pengirim maksimal 200 karakter"),
    address: z
      .string()
      .max(2000, "Alamat pengirim maksimal 2000 karakter")
      .optional(),
    email: z
      .string()
      .email()
      .max(255, "Email pengirim maksimal 255 karakter")
      .optional(),
    phone: z
      .string()
      .max(50, "Telepon pengirim maksimal 50 karakter")
      .optional(),
  }),
  client: z.object({
    name: z
      .string()
      .min(1, "Nama klien wajib diisi")
      .max(200, "Nama klien maksimal 200 karakter"),
    address: z
      .string()
      .max(2000, "Alamat klien maksimal 2000 karakter")
      .optional(),
    email: z
      .string()
      .email()
      .max(255, "Email klien maksimal 255 karakter")
      .optional(),
    phone: z
      .string()
      .max(50, "Telepon klien maksimal 50 karakter")
      .optional(),
  }),
  meta: z.object({
    invoiceNumber: z
      .string()
      .min(1, "Nomor invoice wajib diisi")
      .max(100, "Nomor invoice maksimal 100 karakter"),
    issueDate: z
      .string()
      .min(1, "Tanggal invoice wajib diisi")
      .max(50, "Tanggal invoice maksimal 50 karakter"),
    dueDate: z
      .string()
      .max(50, "Tanggal jatuh tempo maksimal 50 karakter")
      .optional(),
    currency: z
      .string()
      .max(50, "Mata uang maksimal 50 karakter")
      .default("IDR"),
  }),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Minimal 1 item diperlukan")
    .max(100, "Maksimal 100 item diperbolehkan"),
  notes: z
    .string()
    .max(10000, "Catatan maksimal 10000 karakter")
    .optional(),
  paymentInstruction: z
    .string()
    .max(10000, "Instruksi pembayaran maksimal 10000 karakter")
    .optional(),
  gocar: z
    .object({
      driverName: z
        .string()
        .max(1000, "Nama driver maksimal 1000 karakter")
        .optional(),
      vehiclePlate: z
        .string()
        .max(1000, "Nomor kendaraan maksimal 1000 karakter")
        .optional(),
      vehicleType: z
        .string()
        .max(1000, "Tipe kendaraan maksimal 1000 karakter")
        .optional(),
      distance: z
        .string()
        .max(1000, "Jarak maksimal 1000 karakter")
        .optional(),
      duration: z
        .string()
        .max(1000, "Durasi maksimal 1000 karakter")
        .optional(),
      pickupTime: z
        .string()
        .max(1000, "Waktu jemput maksimal 1000 karakter")
        .optional(),
      pickupLocationName: z
        .string()
        .max(1000, "Nama lokasi jemput maksimal 1000 karakter")
        .optional(),
      pickupAddress: z
        .string()
        .max(1000, "Alamat jemput maksimal 1000 karakter")
        .optional(),
      dropoffTime: z
        .string()
        .max(1000, "Waktu tujuan maksimal 1000 karakter")
        .optional(),
      dropoffLocationName: z
        .string()
        .max(1000, "Nama lokasi tujuan maksimal 1000 karakter")
        .optional(),
      dropoffAddress: z
        .string()
        .max(1000, "Alamat tujuan maksimal 1000 karakter")
        .optional(),
      paymentMethod: z
        .string()
        .max(1000, "Metode pembayaran maksimal 1000 karakter")
        .optional(),
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
