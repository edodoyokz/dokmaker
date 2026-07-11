"use client";

import { useMemo } from "react";
import {
  Car,
  Calendar,
  User,
  CreditCard,
  MapPin,
  Building,
  Clock,
  Route,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GoCarReceiptContent } from "@/modules/documents/gocar-receipt-content.schema";
import { LocationAutocomplete } from "./location-autocomplete";

interface GoCarReceiptFormFieldsProps {
  content: GoCarReceiptContent;
  onChange: (content: GoCarReceiptContent) => void;
  disabled?: boolean;
}

const inputClass =
  "block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all";

const labelClass =
  "block text-xs font-semibold text-zinc-400 ";

export function GoCarReceiptFormFields({
  content,
  onChange,
  disabled = false,
}: GoCarReceiptFormFieldsProps) {
  const paymentTotal = useMemo(
    () =>
      content.payment.tripFee +
      content.payment.appFee -
      content.payment.appFeeDiscount,
    [content.payment]
  );

  const updateService = (service: Partial<GoCarReceiptContent["service"]>) => {
    onChange({ ...content, service: { ...content.service, ...service } });
  };

  const updateCustomer = (
    customer: Partial<GoCarReceiptContent["customer"]>
  ) => {
    onChange({ ...content, customer: { ...content.customer, ...customer } });
  };

  const updatePayment = (
    payment: Partial<GoCarReceiptContent["payment"]>
  ) => {
    const next = { ...content.payment, ...payment };
    // Keep totalPaid in lockstep with line items so PDF rows never disagree.
    if (
      payment.tripFee !== undefined ||
      payment.appFee !== undefined ||
      payment.appFeeDiscount !== undefined
    ) {
      next.totalPaid =
        next.tripFee + next.appFee - next.appFeeDiscount;
    }
    onChange({ ...content, payment: next });
  };

  const updateTrip = (trip: Partial<GoCarReceiptContent["trip"]>) => {
    onChange({ ...content, trip: { ...content.trip, ...trip } });
  };

  const updateIssuer = (issuer: Partial<GoCarReceiptContent["issuer"]>) => {
    onChange({ ...content, issuer: { ...content.issuer, ...issuer } });
  };

  return (
    <div className="space-y-6">
      {/* Order Info */}
      <Card className="border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <Car className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-zinc-200">
            Informasi Pesanan
          </h2>
        </div>
        <CardContent className="p-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Layanan</label>
            <input
              type="text"
              value={content.service.name}
              onChange={(e) => updateService({ name: e.target.value })}
              required
              disabled={disabled}
              placeholder="GoCar"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>ID Pesanan</label>
            <input
              type="text"
              value={content.service.orderId}
              onChange={(e) => updateService({ orderId: e.target.value })}
              required
              disabled={disabled}
              placeholder="RB-4153088-49607870"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Tanggal Pesanan</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
              <input
                type="text"
                value={content.service.orderDate}
                onChange={(e) => updateService({ orderDate: e.target.value })}
                required
                disabled={disabled}
                placeholder="Kamis, 11 Juni 2026"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer */}
      <Card className="border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <User className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-zinc-200">
            Customer
          </h2>
        </div>
        <CardContent className="p-5">
          <div className="space-y-1.5">
            <label className={labelClass}>Nama Customer</label>
            <input
              type="text"
              value={content.customer.name}
              onChange={(e) => updateCustomer({ name: e.target.value })}
              required
              disabled={disabled}
              placeholder="Bernadus Putra"
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card className="border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <CreditCard className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-bold text-zinc-200">
            Rincian Pembayaran
          </h2>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClass}>Tarif Perjalanan (Rp)</label>
              <input
                type="number"
                value={content.payment.tripFee}
                onChange={(e) =>
                  updatePayment({ tripFee: Number(e.target.value) })
                }
                min={0}
                required
                disabled={disabled}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Biaya Aplikasi (Rp)</label>
              <input
                type="number"
                value={content.payment.appFee}
                onChange={(e) =>
                  updatePayment({ appFee: Number(e.target.value) })
                }
                min={0}
                required
                disabled={disabled}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Diskon Biaya Aplikasi (Rp)</label>
              <input
                type="number"
                value={content.payment.appFeeDiscount}
                onChange={(e) =>
                  updatePayment({ appFeeDiscount: Number(e.target.value) })
                }
                min={0}
                disabled={disabled}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Metode Pembayaran</label>
            <input
              type="text"
              value={content.payment.method}
              onChange={(e) => updatePayment({ method: e.target.value })}
              required
              disabled={disabled}
              placeholder="GoPay"
              className={inputClass}
            />
          </div>

          <div className="mt-4 border-t border-zinc-800/80 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">
                Total dibayar
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tarif + biaya aplikasi − diskon (otomatis)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tracking-tight text-emerald-400 mt-0.5">
                Rp{paymentTotal.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip */}
      <Card className="border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <Route className="h-4 w-4 text-pink-400" />
          <h2 className="text-sm font-bold text-zinc-200">
            Detail Perjalanan
          </h2>
        </div>
        <CardContent className="p-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Nama Driver</label>
            <input
              type="text"
              value={content.trip.driverName}
              onChange={(e) => updateTrip({ driverName: e.target.value })}
              required
              disabled={disabled}
              placeholder="UDIN SAPRUDIN"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Plat Kendaraan</label>
            <input
              type="text"
              value={content.trip.vehiclePlate}
              onChange={(e) => updateTrip({ vehiclePlate: e.target.value })}
              required
              disabled={disabled}
              placeholder="B2036UZX"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Model Kendaraan</label>
            <input
              type="text"
              value={content.trip.vehicleModel ?? ""}
              onChange={(e) => updateTrip({ vehicleModel: e.target.value })}
              disabled={disabled}
              placeholder="Toyota Calya"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Jarak</label>
            <input
              type="text"
              value={content.trip.distance ?? ""}
              onChange={(e) => updateTrip({ distance: e.target.value })}
              disabled={disabled}
              placeholder="8.8 km"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Durasi</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
              <input
                type="text"
                value={content.trip.duration ?? ""}
                onChange={(e) => updateTrip({ duration: e.target.value })}
                disabled={disabled}
                placeholder="32 menit"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pickup */}
      <Card className="border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <MapPin className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-bold text-zinc-200">
            Titik Jemput
          </h2>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Waktu Jemput</label>
            <input
              type="text"
              value={content.trip.pickupTime ?? ""}
              onChange={(e) => updateTrip({ pickupTime: e.target.value })}
              disabled={disabled}
              placeholder="11 Juni 2026 jam 15:25"
              className={inputClass}
            />
          </div>
          <LocationAutocomplete
            name={content.trip.pickupName ?? ""}
            address={content.trip.pickupAddress ?? ""}
            disabled={disabled}
            nameLabel="Nama Lokasi Jemput"
            addressLabel="Alamat Jemput"
            namePlaceholder="Cari / ketik lokasi jemput…"
            addressPlaceholder="Gelora, Tanahabang, Jakarta Pusat, DKI Jakarta"
            onNameChange={(pickupName) => updateTrip({ pickupName })}
            onAddressChange={(pickupAddress) => updateTrip({ pickupAddress })}
            onPick={({ name: pickupName, address: pickupAddress }) =>
              updateTrip({ pickupName, pickupAddress })
            }
          />
        </CardContent>
      </Card>

      {/* Dropoff */}
      <Card className="border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <MapPin className="h-4 w-4 text-rose-400" />
          <h2 className="text-sm font-bold text-zinc-200">
            Titik Tujuan
          </h2>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Waktu Sampai</label>
            <input
              type="text"
              value={content.trip.dropoffTime ?? ""}
              onChange={(e) => updateTrip({ dropoffTime: e.target.value })}
              disabled={disabled}
              placeholder="11 Juni 2026 jam 15:57"
              className={inputClass}
            />
          </div>
          <LocationAutocomplete
            name={content.trip.dropoffName ?? ""}
            address={content.trip.dropoffAddress ?? ""}
            disabled={disabled}
            nameLabel="Nama Lokasi Tujuan"
            addressLabel="Alamat Tujuan"
            namePlaceholder="Cari / ketik lokasi tujuan…"
            addressPlaceholder="Jl. Medan Merdeka Timur No.1, Gambir, Jakarta Pusat"
            onNameChange={(dropoffName) => updateTrip({ dropoffName })}
            onAddressChange={(dropoffAddress) => updateTrip({ dropoffAddress })}
            onPick={({ name: dropoffName, address: dropoffAddress }) =>
              updateTrip({ dropoffName, dropoffAddress })
            }
          />
        </CardContent>
      </Card>

      {/* Issuer */}
      <Card className="border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/10 flex items-center gap-2.5">
          <Building className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-200">
            Penerbit Faktur
          </h2>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Nama Perusahaan</label>
            <input
              type="text"
              value={content.issuer.companyName ?? ""}
              onChange={(e) => updateIssuer({ companyName: e.target.value })}
              disabled={disabled}
              placeholder="PT GoTo Gojek Tokopedia Tbk"
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClass}>NPWP</label>
              <input
                type="text"
                value={content.issuer.npwp ?? ""}
                onChange={(e) => updateIssuer({ npwp: e.target.value })}
                disabled={disabled}
                placeholder="0745704361064000"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Alamat</label>
              <input
                type="text"
                value={content.issuer.address ?? ""}
                onChange={(e) => updateIssuer({ address: e.target.value })}
                disabled={disabled}
                placeholder="Gedung Pasaraya Blok M..."
                className={inputClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
