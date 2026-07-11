import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("DokMaker UI tokens", () => {
  it("defines app shell dark tokens used by redesign", () => {
    expect(css).toContain("--dm-surface");
    expect(css).toContain("--dm-border");
    expect(css).toContain("--dm-accent");
    expect(css).toContain("--dm-radius-card");
  });

  it("uses indigo primary in dark mode (not light-on-dark)", () => {
    expect(css).toContain("oklch(0.585 0.2 277)");
  });
});
