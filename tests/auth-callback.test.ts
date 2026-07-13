import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("auth oauth callback route", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/auth/callback/route.ts"),
    "utf8"
  );

  it("exchanges code for session and guards open redirects", () => {
    expect(src).toContain("exchangeCodeForSession");
    expect(src).toContain('raw.startsWith("//")');
    expect(src).toContain('return "/app"');
    expect(src).toContain("/login");
  });
});
