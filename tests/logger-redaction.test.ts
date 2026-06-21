import { describe, expect, it } from "vitest";
import { redactSecrets } from "@/lib/logger";

describe("redactSecrets", () => {
  it("redacts api_key query parameter", () => {
    const url =
      "https://app.pakasir.com/api/transactiondetail?project=dokmaker&order_id=ORD-1&api_key=super-secret-key";
    const redacted = redactSecrets(url);
    expect(redacted).toContain("api_key=[REDACTED]");
    expect(redacted).not.toContain("super-secret-key");
    expect(redacted).toContain("order_id=ORD-1");
  });

  it("redacts PAKASIR_API_KEY assignment", () => {
    const line = "PAKASIR_API_KEY=abc-123-456";
    expect(redactSecrets(line)).toBe("PAKASIR_API_KEY=[REDACTED]");
  });

  it("redacts PAKASIR_API_KEY in JSON-style string", () => {
    const obj = '{"PAKASIR_API_KEY": "abc-123-456"}';
    const redacted = redactSecrets(obj);
    expect(redacted).toContain("[REDACTED]");
    expect(redacted).not.toContain("abc-123-456");
  });

  it("redacts Authorization Bearer tokens", () => {
    const header = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig";
    const redacted = redactSecrets(header);
    expect(redacted).toContain("Bearer [REDACTED]");
    expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  it("redacts SUPABASE_SERVICE_ROLE_KEY and R2_SECRET_ACCESS_KEY", () => {
    const input =
      "SUPABASE_SERVICE_ROLE_KEY=svc-role-secret; R2_SECRET_ACCESS_KEY=r2-secret";
    const redacted = redactSecrets(input);
    expect(redacted).toContain("SUPABASE_SERVICE_ROLE_KEY=[REDACTED]");
    expect(redacted).toContain("R2_SECRET_ACCESS_KEY=[REDACTED]");
  });

  it("returns input unchanged when no secrets are present", () => {
    const input = "Webhook received for order_id=ORD-1 amount=50000";
    expect(redactSecrets(input)).toBe(input);
  });
});
