import type { GoCarReceiptContent } from "./gocar-receipt-content.schema";
import { escapeHtml, formatRupiah } from "@/modules/templates/render-utils";

export function buildGoCarReceiptRenderContext(
  content: GoCarReceiptContent
): Record<string, string> {
  const paymentTotal =
    content.payment.tripFee +
    content.payment.appFee -
    content.payment.appFeeDiscount;

  return {
    "service.name": escapeHtml(content.service.name),
    "service.orderDate": escapeHtml(content.service.orderDate),
    "service.orderId": escapeHtml(content.service.orderId),
    "customer.name": escapeHtml(content.customer.name),
    "payment.totalPaid": formatRupiah(content.payment.totalPaid),
    "payment.tripFee": formatRupiah(content.payment.tripFee),
    "payment.appFee": formatRupiah(content.payment.appFee),
    "payment.appFeeDiscount": formatRupiah(content.payment.appFeeDiscount),
    "payment.total": formatRupiah(paymentTotal),
    "payment.method": escapeHtml(content.payment.method),
    "trip.driverName": escapeHtml(content.trip.driverName),
    "trip.vehiclePlate": escapeHtml(content.trip.vehiclePlate),
    "trip.vehicleModel": escapeHtml(content.trip.vehicleModel),
    "trip.distance": escapeHtml(content.trip.distance),
    "trip.duration": escapeHtml(content.trip.duration),
    "trip.pickupTime": escapeHtml(content.trip.pickupTime),
    "trip.pickupName": escapeHtml(content.trip.pickupName),
    "trip.pickupAddress": escapeHtml(content.trip.pickupAddress),
    "trip.dropoffTime": escapeHtml(content.trip.dropoffTime),
    "trip.dropoffName": escapeHtml(content.trip.dropoffName),
    "trip.dropoffAddress": escapeHtml(content.trip.dropoffAddress),
    "issuer.companyName": escapeHtml(content.issuer.companyName),
    "issuer.npwp": escapeHtml(content.issuer.npwp),
    "issuer.address": escapeHtml(content.issuer.address),
  };
}
