import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * Guards the environment contract:
 * - Server-only secrets must never be exposed to client bundles via a
 *   NEXT_PUBLIC_ prefix (that would inline them into shipped JS).
 * - The repo must ship a .env.example documenting all required variables.
 */
describe("environment contract", () => {
  it("never exposes PAKASIR_API_KEY as a NEXT_PUBLIC_ variable in source", () => {
    // grep exits non-zero when nothing matches; normalize to empty string.
    const out = execSync(
      "grep -rl 'NEXT_PUBLIC_PAKASIR' src || true",
      { encoding: "utf8" }
    );
    expect(out.trim()).toBe("");
  });

  it("never exposes PAKASIR_API_KEY as a NEXT_PUBLIC_ variable in env example", () => {
    const out = execSync("grep -c 'NEXT_PUBLIC_PAKASIR' .env.example || true", {
      encoding: "utf8",
    });
    // grep -c prints "0" when no match; any non-zero count is a violation.
    expect(Number(out.trim())).toBe(0);
  });

  it(".env.example documents all required variables", () => {
    const example = execSync("cat .env.example", { encoding: "utf8" });
    const required = [
      "DATABASE_URL",
      "DIRECT_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "PAKASIR_PROJECT_SLUG",
      "PAKASIR_BASE_URL",
      "PAKASIR_API_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ];
    for (const key of required) {
      expect(example).toContain(key);
    }
  });
});
