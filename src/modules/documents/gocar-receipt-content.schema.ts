import { z } from "zod";

export const gocarReceiptContentSchema = z.object({
  service: z.object({
    name: z
      .string()
      .min(1, "Nama layanan wajib diisi")
      .max(100, "Nama layanan maksimal 100 karakter")
      .default("GoCar"),
    orderDate: z
      .string()
      .min(1, "Tanggal pesanan wajib diisi")
      .max(200, "Tanggal pesanan maksimal 200 karakter"),
    orderId: z
      .string()
      .min(1, "ID pesanan wajib diisi")
      .max(200, "ID pesanan maksimal 200 karakter"),
  }),
  customer: z.object({
    name: z
      .string()
      .min(1, "Nama customer wajib diisi")
      .max(200, "Nama customer maksimal 200 karakter"),
  }),
  payment: z.object({
    totalPaid: z.number().nonnegative("Total pembayaran tidak boleh negatif"),
    tripFee: z.number().nonnegative("Biaya perjalanan tidak boleh negatif"),
    appFee: z.number().nonnegative("Biaya jasa aplikasi tidak boleh negatif"),
    appFeeDiscount: z
      .number()
      .nonnegative("Diskon biaya jasa aplikasi tidak boleh negatif")
      .default(0),
    method: z
      .string()
      .min(1, "Metode pembayaran wajib diisi")
      .max(100, "Metode pembayaran maksimal 100 karakter")
      .default("GoPay"),
  }),
  trip: z.object({
    driverName: z
      .string()
      .min(1, "Nama driver wajib diisi")
      .max(500, "Nama driver maksimal 500 karakter"),
    vehiclePlate: z
      .string()
      .min(1, "Nomor kendaraan wajib diisi")
      .max(500, "Nomor kendaraan maksimal 500 karakter"),
    vehicleModel: z
      .string()
      .max(500, "Model kendaraan maksimal 500 karakter")
      .optional(),
    distance: z
      .string()
      .max(500, "Jarak maksimal 500 karakter")
      .optional(),
    duration: z
      .string()
      .max(500, "Durasi maksimal 500 karakter")
      .optional(),
    pickupTime: z
      .string()
      .max(500, "Waktu jemput maksimal 500 karakter")
      .optional(),
    pickupName: z
      .string()
      .max(500, "Nama lokasi jemput maksimal 500 karakter")
      .optional(),
    pickupAddress: z
      .string()
      .max(2000, "Alamat jemput maksimal 2000 karakter")
      .optional(),
    dropoffTime: z
      .string()
      .max(500, "Waktu tujuan maksimal 500 karakter")
      .optional(),
    dropoffName: z
      .string()
      .max(500, "Nama lokasi tujuan maksimal 500 karakter")
      .optional(),
    dropoffAddress: z
      .string()
      .max(2000, "Alamat tujuan maksimal 2000 karakter")
      .optional(),
  }),
  issuer: z.object({
    companyName: z
      .string()
      .max(500, "Nama perusahaan maksimal 500 karakter")
      .optional(),
    npwp: z
      .string()
      .max(500, "NPWP maksimal 500 karakter")
      .optional(),
    address: z
      .string()
      .max(2000, "Alamat penerbit maksimal 2000 karakter")
      .optional(),
  }),
});

export type GoCarReceiptContent = z.infer<typeof gocarReceiptContentSchema>;

export function getDefaultGoCarReceiptContent(): GoCarReceiptContent {
  return {
    service: {
      name: "GoCar",
      orderDate: "Kamis, 11 Juni 2026",
      orderId: "RB-4153088-49607870",
    },
    customer: {
      name: "Bernadus Putra",
    },
    payment: {
      totalPaid: 50000,
      tripFee: 42500,
      appFee: 7500,
      appFeeDiscount: 0,
      method: "GoPay",
    },
    trip: {
      driverName: "UDIN SAPRUDIN",
      vehiclePlate: "B2036UZX",
      vehicleModel: "Toyota Calya",
      distance: "8.8 km",
      duration: "32 menit",
      pickupTime: "11 Juni 2026 jam 15:25",
      pickupName: "Sentral Senayan 1 - 2",
      pickupAddress:
        "Gelora, Tanahabang, Jakarta Pusat, DKI Jakarta",
      dropoffTime: "11 Juni 2026 jam 15:57",
      dropoffName: "Stasiun Gambir",
      dropoffAddress:
        "Jl. Medan Merdeka Timur. No.1, Gambir, Gambir, Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10110, Indonesia",
    },
    issuer: {
      companyName: "PT GoTo Gojek Tokopedia Tbk",
      npwp: "0745704361064000",
      address:
        "Gedung Pasaraya Blok M Gd.B Lt.6&7, Jl. Iskandarsyah II, 2, Melawai, Kebayoran Baru, Kota Adm. Jakarta Selatan, DKI Jakarta, 12160",
    },
  };
}
