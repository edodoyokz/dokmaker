import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nav = readFileSync("src/components/layout/mobile-bottom-nav.tsx", "utf8");
const layout = readFileSync("src/app/app/layout.tsx", "utf8");

describe("App chrome redesign", () => {
  it("uses equal-height bottom nav without floating FAB lift", () => {
    expect(nav).toContain("hide");
    expect(nav).not.toContain("-translate-y-4");
    expect(nav).not.toContain("from-indigo-600 to-purple-600");
    expect(nav).toContain("text-xs");
  });

  it("uses solid logo mark without gradient wordmark", () => {
    expect(layout).toContain("bg-indigo-600");
    expect(layout).not.toContain("from-indigo-500 to-purple-500");
    expect(layout).not.toContain("bg-clip-text");
  });
});
