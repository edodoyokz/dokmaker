export type LogLevel = "info" | "warn" | "error" | "debug";

export type LogCategory =
  | "auth"
  | "payment"
  | "wallet"
  | "invoice"
  | "pdf"
  | "admin"
  | "webhook"
  | "download";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
}

/**
 * Structured logger for DokMaker.
 * In production, send to logging service (e.g., Datadog, Sentry, CloudWatch).
 */
export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: Record<string, unknown>,
  userId?: string
): void {
  // In development, log to console
  if (process.env.NODE_ENV === "development") {
    const logFn =
      level === "error"
        ? console.error
        : level === "warn"
        ? console.warn
        : console.log;
    logFn(`[${category}] ${message}`, data || "");
  }

  // In production, send to logging service
  // Example: await sendToLogService(entry);
}

// Convenience methods
export const logger = {
  auth: (message: string, data?: Record<string, unknown>, userId?: string) =>
    log("info", "auth", message, data, userId),

  payment: (
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ) => log("info", "payment", message, data, userId),

  wallet: (message: string, data?: Record<string, unknown>, userId?: string) =>
    log("info", "wallet", message, data, userId),

  invoice: (
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ) => log("info", "invoice", message, data, userId),

  pdf: (message: string, data?: Record<string, unknown>, userId?: string) =>
    log("info", "pdf", message, data, userId),

  admin: (message: string, data?: Record<string, unknown>, userId?: string) =>
    log("info", "admin", message, data, userId),

  webhook: (
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ) => log("info", "webhook", message, data, userId),

  download: (
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ) => log("info", "download", message, data, userId),

  warn: (
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ) => log("warn", category, message, data, userId),

  error: (
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ) => log("error", category, message, data, userId),
};
