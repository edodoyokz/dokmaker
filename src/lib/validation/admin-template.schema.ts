import { z } from "zod";

export const adminTemplatePayloadSchema = z.object({
  name: z.string().min(1, "Nama template wajib diisi").max(200, "Nama template maksimal 200 karakter"),
  description: z.string().max(5000, "Deskripsi template maksimal 5000 karakter").optional(),
  htmlTemplate: z
    .string()
    .min(1, "HTML template wajib diisi")
    .max(500000, "HTML template maksimal 500000 karakter"),
});

export type AdminTemplatePayload = z.infer<typeof adminTemplatePayloadSchema>;

export const adminTemplateUpdateSchema = z.object({
  name: z.string().min(1, "Nama template wajib diisi").max(200, "Nama template maksimal 200 karakter").optional(),
  description: z.string().max(5000, "Deskripsi template maksimal 5000 karakter").optional().nullable(),
  htmlTemplate: z
    .string()
    .min(1, "HTML template wajib diisi")
    .max(500000, "HTML template maksimal 500000 karakter")
    .optional(),
  price: z.number().int().min(0, "Harga tidak boleh negatif").optional(),
  status: z.enum(["active", "inactive"]).optional(),
  documentType: z.string().max(50, "Tipe dokumen maksimal 50 karakter").optional(),
  sortOrder: z.number().int().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "Minimal satu field harus diisi",
});

export type AdminTemplateUpdate = z.infer<typeof adminTemplateUpdateSchema>;
