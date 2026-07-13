import { describe, expect, it } from "vitest";
import { mapAuthError } from "@/lib/auth-errors";

describe("mapAuthError", () => {
  it("maps common supabase messages to Indonesian", () => {
    expect(mapAuthError("Invalid login credentials")).toMatch(/salah/i);
    expect(mapAuthError("User already registered")).toMatch(/terdaftar/i);
    expect(mapAuthError("Email not confirmed")).toMatch(/dikonfirmasi/i);
    expect(mapAuthError("Email rate limit exceeded")).toMatch(/email/i);
    expect(mapAuthError("Too many requests")).toMatch(/percobaan/i);
    expect(mapAuthError("Provider is not enabled")).toMatch(/Google/i);
  });

  it("handles empty", () => {
    expect(mapAuthError(undefined)).toMatch(/kesalahan/i);
  });
});
