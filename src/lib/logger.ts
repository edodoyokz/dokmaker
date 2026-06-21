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

/**
 * Patterns of secrets that must never be written to logs. The replacement is
 * conservative and intentionally redacts anything that looks like an api_key
 * query parameter, an Authorization header, or a known env-style secret name
 * followed by a value.
 */
const SECRET_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  // Query-string api_key / api-key / apikey
  { re: /(api[_-]?key=)[^&\s]+/gi, replacement: "\$1[REDACTED]" },
  // Env-style PAkasir API key assignment in stringified objects/URLs
  { re: /(PAKASIR_API_KEY["']?\s*[:=]\s*["']?)[^"'&\s,]+/gi, replacement: "\$1[REDACTED]" },
  // Generic Bearer token header
  { re: /(Bearer\s+)[A-Za-z0-9._\-]+/gi, replacement: "\$1[REDACTED]" },
  // Supabase service role key markers
  { re: /(SUPABASE_SERVICE_ROLE_KEY["']?\s*[:=]\s*["']?)[^"'&\s,]+/gi, replacement: "\$1[REDACTED]" },
  // R2 / S3 secret access keys
  { re: /(R2_SECRET_ACCESS_KEY["']?\s*[:=]\s*["']?)[^"'&\s,]+/gi, replacement: "\$1[REDACTED]" },
];

/**
 * Redact known secret patterns from a string. Returns the input unchanged if
 * it contains nothing matching. Exposed for testing.
 */
export function redactSecrets(value: string): string {
  let result = value;
  for (const { re, replacement } of SECRET_PATTERNS) {
    result = result.replace(re, replacement);
  }
  return result;
}

function redactUnknown(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (value instanceof Error) {
    return { ...value, message: redactSecrets(value.message), stack: value.stack ? redactSecrets(value.stack) : value.stack };
  }
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactUnknown(v);
    }
    return out;
  }
  return value;
}

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
  // Never let known secrets reach the log sink, even in development.
  const safeMessage = redactSecrets(message);
  const safeData = redactUnknown(data) as Record<string, unknown> | undefined;
  const safeUserId = userId ? redactSecrets(userId) : userId;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message: safeMessage,
    data: safeData,
    userId: safeUserId,
  };

  // In development, log to console
  if (process.env.NODE_ENV === "development") {
    const logFn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    logFn(`[${entry.category}] ${entry.message}`, entry.data || "");
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
