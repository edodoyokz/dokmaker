import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const header = readFileSync("src/components/ui/page-header.tsx", "utf8");
const badge = readFileSync("src/components/ui/status-badge.tsx", "utf8");

describe("UI primitives", () => {
  it("exports PageHeader and StatusBadge", () => {
    expect(header).toContain("export function PageHeader");
    expect(badge).toContain("export function StatusBadge");
    expect(badge).toContain("paid");
    expect(badge).toContain("unpaid");
  });
});
