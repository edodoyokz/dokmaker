import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapAuthError } from "@/lib/auth-errors";

const loginPage = readFileSync("src/app/login/page.tsx", "utf8");

describe("LoginPage OAuth error", () => {
  it("schedules query error state outside the effect body", () => {
    expect(loginPage).toContain("queueMicrotask(() => setError(mapAuthError(raw)))");
    expect(loginPage).not.toContain("if (raw) setError(mapAuthError(raw))");
  });
});

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
