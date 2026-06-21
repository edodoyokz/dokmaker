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
