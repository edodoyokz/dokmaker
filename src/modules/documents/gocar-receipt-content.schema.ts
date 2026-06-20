import { z } from "zod";

export const gocarReceiptContentSchema = z.object({
  service: z.object({
    name: z.string().min(1, "Nama layanan wajib diisi").default("GoCar"),
    orderDate: z.string().min(1, "Tanggal pesanan wajib diisi"),
    orderId: z.string().min(1, "ID pesanan wajib diisi"),
  }),
  customer: z.object({
    name: z.string().min(1, "Nama customer wajib diisi"),
  }),
  payment: z.object({
    totalPaid: z.number().nonnegative("Total pembayaran tidak boleh negatif"),
    tripFee: z.number().nonnegative("Biaya perjalanan tidak boleh negatif"),
    appFee: z.number().nonnegative("Biaya jasa aplikasi tidak boleh negatif"),
    appFeeDiscount: z.number().nonnegative("Diskon biaya jasa aplikasi tidak boleh negatif").default(0),
    method: z.string().min(1, "Metode pembayaran wajib diisi").default("GoPay"),
  }),
  trip: z.object({
    driverName: z.string().min(1, "Nama driver wajib diisi"),
    vehiclePlate: z.string().min(1, "Nomor kendaraan wajib diisi"),
    vehicleModel: z.string().optional(),
    distance: z.string().optional(),
    duration: z.string().optional(),
    pickupTime: z.string().optional(),
    pickupName: z.string().optional(),
    pickupAddress: z.string().optional(),
    dropoffTime: z.string().optional(),
    dropoffName: z.string().optional(),
    dropoffAddress: z.string().optional(),
  }),
  issuer: z.object({
    companyName: z.string().optional(),
    npwp: z.string().optional(),
    address: z.string().optional(),
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
      pickupAddress: "Gelora, Tanahabang, Jakarta Pusat, DKI Jakarta",
      dropoffTime: "11 Juni 2026 jam 15:57",
      dropoffName: "Stasiun Gambir",
      dropoffAddress:
        "Jl. Medan Merdeka Timur No.1, Gambir, Gambir, Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10110, Indonesia",
    },
    issuer: {
      companyName: "PT GoTo Gojek Tokopedia Tbk",
      npwp: "0745704361064000",
      address:
        "Gedung Pasaraya Blok M Gd.B Lt.6&7, Jl. Iskandarsyah II, 2, Melawai, Kebayoran Baru, Kota Adm. Jakarta Selatan, DKI Jakarta, 12160",
    },
  };
}
