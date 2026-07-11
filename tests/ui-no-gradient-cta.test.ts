import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [
  "src/app/login/page.tsx",
  "src/app/register/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/app/layout.tsx",
  "src/components/dashboard.tsx",
  "src/app/app/invoices/page.tsx",
  "src/app/app/wallet/page.tsx",
  "src/app/app/wallet/topup/page.tsx",
  "src/components/layout/mobile-bottom-nav.tsx",
  "src/components/documents/document-create-form.tsx",
  "src/app/app/invoices/[invoiceId]/edit/edit-form.tsx",
  "src/app/app/invoices/[invoiceId]/preview/preview-client.tsx",
];

describe("UI redesign: no gradient CTAs / glow orbs in app shell", () => {
  for (const path of files) {
    it(`${path} has no purple gradient CTA or blur orbs`, () => {
      const src = readFileSync(path, "utf8");
      expect(src).not.toContain("from-indigo-600 to-purple-600");
      expect(src).not.toContain("blur-[100px]");
      expect(src).not.toContain("blur-[80px]");
      expect(src).not.toContain("blur-[50px]");
    });
  }
});
