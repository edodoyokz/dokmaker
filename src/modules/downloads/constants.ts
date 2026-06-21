/**
 * How long an invoice version may stay in `processing_payment` before it is
 * considered abandoned and eligible for reset back to `unpaid`.
 */
export const PROCESSING_PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
