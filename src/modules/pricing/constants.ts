/** Final download price in IDR (minor unit) */
export const FINAL_DOWNLOAD_PRICE = 10_000;

/** Allowed top-up amounts in IDR (minor unit) */
export const ALLOWED_TOPUP_AMOUNTS = [50_000, 100_000] as const;

/** Default currency */
export const DEFAULT_CURRENCY = "IDR";

/** Type for allowed top-up amounts */
export type AllowedTopupAmount = (typeof ALLOWED_TOPUP_AMOUNTS)[number];
