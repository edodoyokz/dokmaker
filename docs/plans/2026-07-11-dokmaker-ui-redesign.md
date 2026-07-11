# DokMaker UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise user-facing UI from “dev MVP skin” to a calm, consistent, mobile-first product surface without changing financial, auth, or PDF-stamp behavior.

**Architecture:** Token-first redesign. Lock a small design system in CSS variables + Tailwind theme, then re-skin critical screens to consume those tokens (no new component library, no Figma pipeline). Chrome (header / bottom nav / sticky CTA) becomes one system; document preview stays visually separate (white paper on dark app shell).

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4 (`src/app/globals.css` `@theme`), existing shadcn/ui primitives (`src/components/ui/*`), Vitest source/contract tests where useful.

---

## 0. Constraints (hard)

- **Do not change:** wallet ledger, Pakasir webhook, download debit, stamp PDF geometry (`gocar-receipt-pdf.ts`), authz, rate limits, Prisma schema.
- **Do not add:** new UI framework, animation library, icon set swap, light mode (stay dark-only), marketing landing rewrite (optional later).
- **Do not claim** screenshot-proofing; preview watermark rules stay as-is.
- **Mobile-first:** primary acceptance is **360×640** and **390×844**; desktop must not regress.
- **Copy language:** Indonesian for user-facing strings; product noun = **Dokumen** (not “Invoice only”).
- **Fewest files per task;** visual-only diffs preferred. If a screen needs logic change for layout only, keep it layout-only.
- **Verify after each task:** focused tests + `npm run typecheck` before commit when TS surfaces move.

## 1. Design decisions (locked for this plan)

| Token | Decision |
|-------|----------|
| Mood | Calm dark, flat, quiet — **not** neon SaaS / purple glow |
| Background | App shell `#09090b` (zinc-950) — keep |
| Surface | Card `#18181b` (zinc-900), border `#27272a` (zinc-800) — no gradient fills on cards |
| Accent | **Single** indigo `oklch(0.55 0.2 275)` (or existing indigo-500) for primary actions **only** |
| Success | Emerald for paid / credit only |
| Warning | Amber for draft / unpaid only |
| Danger | Rose for errors only |
| Gradients | **Banned** on buttons and cards in app shell (landing may keep one logo mark) |
| Glow orbs | **Delete** (`blur-[100px]` decorative blobs) on login/register/dashboard/wallet |
| Type scale | `text-2xl` page title · `text-sm` body · `text-xs` meta · **no** `text-[9px]`/`text-[10px]` except true badges |
| Radius | Cards `rounded-xl` (12–16px); buttons `rounded-lg`; full-round only for status pills |
| Touch | Primary CTAs `min-h-11` (44px); list rows min tap ~44px |
| Bottom chrome | One sticky surface per screen: either app nav **or** action bar, never competing (already partially done) |
| Preview paper | White document on dark chrome; no zinc border fighting watermark |

**Out of scope for v1 redesign:** admin UI polish, AI generator deep restyle, PWA icon art, brand illustration set.

## 2. Target screens (priority order)

1. App chrome (layout header + mobile bottom nav)
2. Login / register / forgot-password
3. Dashboard
4. Dokumen list
5. Template catalog + template detail
6. Create/edit form shell (sticky save already exists — restyle only)
7. Preview checkout (draft banner + sticky buy)
8. Wallet + topup

## 3. Acceptance criteria (product)

At **360px** width:

- [ ] No horizontal overflow on screens above
- [ ] No purple/indigo **gradient buttons** in `/app/*`
- [ ] No decorative blur orbs in `/app/*` or auth pages
- [ ] Page titles share one style; meta text ≥ `text-xs` and `text-zinc-400+`
- [ ] Primary CTA always solid indigo (or token primary), full-width on mobile sticky bars
- [ ] Dokumen list shows party name + type badge + status without cramped 10px mono clutter
- [ ] Preview: one top header strip + document + one bottom CTA (nav hidden — already)
- [ ] Wallet balance card readable without gradient noise
- [ ] `npm test` green; `npm run typecheck` green
- [ ] Smoke: login → template → create → preview → topup page → wallet (visual only)

---

## Task 1: Design tokens in `globals.css`

**Files:**
- Modify: `src/app/globals.css`
- Create: `tests/ui-tokens-source.test.ts` (source contract — cheap regression)

**Step 1: Write failing source test**

```ts
// tests/ui-tokens-source.test.ts
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
});
```

**Step 2: Run — expect FAIL**

```bash
npm test -- tests/ui-tokens-source.test.ts
```

**Step 3: Add tokens (minimal)**

In `src/app/globals.css`, under `.dark` (or root dark body), add:

```css
/* DokMaker app shell tokens — redesign 2026-07-11 */
.dark {
  --dm-bg: #09090b;
  --dm-surface: #18181b;
  --dm-surface-2: #09090b;
  --dm-border: #27272a;
  --dm-text: #fafafa;
  --dm-muted: #a1a1aa;
  --dm-accent: #6366f1; /* indigo-500 */
  --dm-accent-hover: #818cf8;
  --dm-success: #34d399;
  --dm-warning: #fbbf24;
  --dm-danger: #fb7185;
  --dm-radius-card: 0.75rem;
  --dm-radius-btn: 0.5rem;
}
```

Optionally map shadcn `--primary` to accent so `buttonVariants()` default becomes solid indigo without per-screen gradients:

```css
.dark {
  --primary: oklch(0.585 0.2 277); /* indigo-ish */
  --primary-foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885); /* zinc-900-ish */
  --border: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
}
```

Do **not** invent a second theme.

**Step 4: Run test — PASS**

```bash
npm test -- tests/ui-tokens-source.test.ts
```

**Step 5: Commit**

```bash
git add src/app/globals.css tests/ui-tokens-source.test.ts
git commit -m "feat(ui): add DokMaker shell design tokens"
```

---

## Task 2: Shared UI primitives (PageHeader, StatusBadge, Solid CTA)

**Files:**
- Create: `src/components/ui/page-header.tsx`
- Create: `src/components/ui/status-badge.tsx`
- Modify: `src/components/ui/button.tsx` only if default `default` variant still looks off after token map
- Create: `tests/ui-primitives-source.test.ts`

**Step 1: Failing source test**

```ts
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
```

**Step 2: Implement `PageHeader`**

```tsx
// src/components/ui/page-header.tsx
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
```

**Step 3: Implement `StatusBadge`**

Centralize Lunas / Belum bayar / Diproses / Draf mapping currently copy-pasted in `dashboard.tsx`, `invoices/page.tsx`, `preview-client.tsx`.

```tsx
// src/components/ui/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  paid: {
    label: "Lunas",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  unpaid: {
    label: "Belum bayar",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
  processing_payment: {
    label: "Diproses",
    className: "border-indigo-500/25 bg-indigo-500/10 text-indigo-400",
  },
  draft: {
    label: "Draf",
    className: "border-zinc-700 bg-zinc-900 text-zinc-400",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const item = MAP[status] ?? {
    label: status,
    className: "border-zinc-700 bg-zinc-900 text-zinc-400",
  };
  return (
    <Badge
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium",
        item.className,
        className
      )}
    >
      {item.label}
    </Badge>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/ui/page-header.tsx src/components/ui/status-badge.tsx tests/ui-primitives-source.test.ts
git commit -m "feat(ui): PageHeader + StatusBadge primitives"
```

---

## Task 3: App chrome restyle (header + bottom nav)

**Files:**
- Modify: `src/app/app/layout.tsx`
- Modify: `src/components/layout/mobile-bottom-nav.tsx`
- Modify: `src/components/layout/mobile-nav.tsx` (sheet items only if needed)
- Test: extend `tests/template-preview-source.test.ts` or small `tests/app-chrome-source.test.ts`

**Goals:**
- Header: flat `border-zinc-800 bg-zinc-950` — drop heavy blur if it muddies; keep light blur OK
- Logo mark: keep small gradient **or** solid indigo square (prefer solid for calm)
- Desktop nav links: `text-sm text-zinc-400 hover:text-zinc-100` — active state via pathname optional (client wrapper only if cheap)
- Bottom nav: 5 items max (already); **remove** floating FAB lift (`-translate-y-4`) — use equal-height items; “Baru” = templates link without giant circle, or keep one elevated center but **smaller** (40px) and no double-label collision
- Labels: `text-xs` not `text-[10px]`

**Step 1: Restyle `MobileBottomNav`**

Replace center FAB block with equal item:

```tsx
// Prefer equal items — less “template app”
<NavItem href="/app/templates" icon={Plus} label="Baru" />
```

If product wants center emphasis, keep circle but `h-10 w-10` and no `-translate-y-4`.

**Step 2: Source test**

```ts
const nav = readFileSync("src/components/layout/mobile-bottom-nav.tsx", "utf8");
expect(nav).not.toContain("-translate-y-4"); // or document intentional exception
expect(nav).toContain("hide");
```

**Step 3: Commit**

```bash
git commit -m "style(ui): calm app chrome + bottom nav"
```

---

## Task 4: Auth screens (login / register / forgot-password)

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/forgot-password/page.tsx`

**Goals:**
- Delete decorative `blur-[100px]` orbs
- Card: `rounded-xl border border-zinc-800 bg-zinc-900 p-6` (not `p-8` + heavy shadow-2xl)
- Inputs: keep existing; ensure `py-3` touch height
- Primary button: **solid** `bg-indigo-600 hover:bg-indigo-500` — **no** `bg-gradient-to-r from-indigo-600 to-purple-600`
- Keep `mapAuthError` + lupa password link

**Step 1: Grep guard**

```bash
rg "from-indigo-600 to-purple-600|blur-\\[100px\\]" src/app/login src/app/register src/app/forgot-password
```

Expected after task: no matches.

**Step 2: Commit**

```bash
git commit -m "style(ui): calm auth screens without glow/gradients"
```

---

## Task 5: Dashboard restyle

**Files:**
- Modify: `src/components/dashboard.tsx`
- Optionally: `src/app/app/page.tsx` (data only — already has `documentPartyName`)

**Goals:**
- Use `PageHeader` + `StatusBadge`
- Wallet card: **flat** surface + border; remove gradient `from-indigo-950 via-zinc-900 to-purple-950` and blur orb
- Show balance large (`text-3xl font-semibold`); CTA “Top up” solid secondary/outline
- Stats “Dokumen terbaru” count stays; kill “Invoice MVP” mono jargon → “PDF final Rp10.000 / versi”
- Quick actions: 2×2 grid, equal cards, icon + label `text-xs`, no hover color rainbow (one hover:border-zinc-600)
- Recent list rows: title, party name (`clientName`), `StatusBadge`, eye button

**Anti-patterns to delete in this file:**
- `bg-gradient-to-br from-indigo-950`
- `blur-[50px]`
- `uppercase tracking-widest` on every label (use once max)
- `text-[10px] font-mono`

**Step 1: Visual checklist at 360px** (manual or Playwright later)

**Step 2: Commit**

```bash
git commit -m "style(ui): restyle dashboard cards and lists"
```

---

## Task 6: Dokumen list restyle

**Files:**
- Modify: `src/app/app/invoices/page.tsx`

**Goals:**
- `PageHeader title="Dokumen" description="Draf dan file final Anda."`
- Primary action: `buttonVariants()` solid (token primary) “Buat dokumen”
- List cards: single row pattern  
  `title` · `type badge`  
  `party · date`  
  `StatusBadge · Pratinjau · Edit`
- Increase vertical padding `p-4`; avoid `text-[10px]` template name — use `text-xs text-zinc-500`
- Empty state: short copy + one CTA (already good — align styles)

**Step 1: Commit**

```bash
git commit -m "style(ui): restyle dokumen list"
```

---

## Task 7: Templates catalog + detail

**Files:**
- Modify: `src/app/app/templates/page.tsx`
- Modify: `src/app/app/templates/[templateId]/page.tsx`

**Goals:**
- Header via `PageHeader`
- Grid cards: flat border, no `-translate-y-1` hover lift (or keep subtle)
- Thumbnail area `bg-zinc-950`; fallback mock keeps gray bars
- Badge “Ready to Use” → Indonesian **“Siap pakai”** or drop
- Detail CTA: solid “Pakai template” full width on mobile
- Price line quiet: `text-sm text-zinc-400`

**Step 1: Commit**

```bash
git commit -m "style(ui): restyle template catalog and detail"
```

---

## Task 8: Form shell (create + edit)

**Files:**
- Modify: `src/components/documents/document-create-form.tsx`
- Modify: `src/app/app/invoices/[invoiceId]/edit/edit-form.tsx`
- Modify: `src/components/documents/gocar-receipt-form-fields.tsx` (card chrome only)
- Modify: `src/components/documents/invoice-form-fields.tsx` (card chrome only)

**Goals:**
- Section cards: `rounded-xl border border-zinc-800 bg-zinc-900/50` — drop `backdrop-blur-md` if redundant
- Section titles: `text-sm font-semibold text-zinc-200` + icon `h-4 w-4` (already cleaned sizes)
- Sticky mobile save bar: solid indigo, `min-h-11`, label “Simpan & pratinjau”
- Desktop submit same label/style
- Inputs: rely on shared `Input` where possible; if raw inputs remain, match `border-zinc-800 bg-zinc-950`

**Do not** restructure field order or payment formula logic.

**Step 1: Commit**

```bash
git commit -m "style(ui): calm form section cards and sticky save"
```

---

## Task 9: Preview checkout restyle

**Files:**
- Modify: `src/app/app/invoices/[invoiceId]/preview/preview-client.tsx`
- Modify: `src/components/invoices/pdf-stamp-preview.tsx` (spacing/labels only)
- Modify: `src/components/invoices/template-preview.tsx` only if paper chrome needs quieter border

**Goals:**
- Draft banner: keep amber honesty; tighten copy to 2 lines; `rounded-xl border border-amber-500/20 bg-amber-500/10`
- Document frame: `rounded-xl border border-zinc-800 bg-zinc-900 p-2` — less nested zinc-950
- Desktop checkout card: use `StatusBadge`; solid buy button; no gradient
- Mobile sticky bar: solid CTA; balance row `text-xs`; error `text-rose-400`
- Labels: “Pratinjau {label}” stays; drop uppercase tracking spam

**Preserve behavior:** download handler, iOS open-tab, toast, price constant, insufficient balance → topup link.

**Step 1: Update source test if class strings change**

`tests/template-preview-source.test.ts` — keep assertions on behavior strings (`FINAL_DOWNLOAD_PRICE`, draft copy, `bottom-0`).

**Step 2: Commit**

```bash
git commit -m "style(ui): restyle preview checkout chrome"
```

---

## Task 10: Wallet + topup restyle

**Files:**
- Modify: `src/app/app/wallet/page.tsx`
- Modify: `src/app/app/wallet/topup/page.tsx`
- Modify: `src/components/wallet/topup-pending-banner.tsx` (minor)

**Goals:**
- Balance card: flat surface, large number, short helper “Rp10.000 / versi PDF final”
- Remove gradient/blur orbs
- Ledger rows: icon credit/debit, amount, `text-xs` date — no mono currency chip unless useful
- Topup packages: selected = `border-indigo-500 bg-indigo-500/10`; unselected flat; **no** “Populer” ribbon clutter (optional quiet badge)
- CTA “Bayar dengan Pakasir” solid full width
- Pending banner stays informational (already good)

**Step 1: Commit**

```bash
git commit -m "style(ui): restyle wallet and topup"
```

---

## Task 11: Gradient / glow purge (repo hygiene)

**Files:** any remaining under `src/app/app`, `src/components` (user-facing)

**Step 1: Inventory**

```bash
rg -n "bg-gradient-to-r from-indigo|from-indigo-950|blur-\\[\\d+px\\]|tracking-widest|text-\\[9px\\]|text-\\[10px\\]" \
  src/app/app src/components/dashboard.tsx src/components/documents \
  src/components/invoices src/components/layout src/app/login src/app/register
```

**Step 2: Fix leftovers** that are pure chrome (skip admin, skip PDF templates under `gocar-receipt-template.ts`).

**Step 3: Add optional lint-ish test**

```ts
// tests/ui-no-gradient-cta.test.ts
const files = [/* list critical pages readFileSync */];
for (const f of files) {
  expect(f, path).not.toContain("from-indigo-600 to-purple-600");
}
```

**Step 4: Commit**

```bash
git commit -m "style(ui): purge glow orbs and gradient CTAs from app shell"
```

---

## Task 12: Verification + evidence

**Step 1: Automated**

```bash
npm test
npm run typecheck
# optional
npm run lint
```

Expected: all green (baseline at plan write: 243+ tests).

**Step 2: Manual smoke (360px DevTools or phone)**

1. Login  
2. Dashboard — no glow, calm cards  
3. Templates → create GoCar → sticky save → preview  
4. Preview — draft banner + buy bar; no bottom nav  
5. Topup packages → (sandbox) return pending banner  
6. Dokumen list — party name + badges  

**Step 3: Screenshot evidence (optional but recommended)**

Save under `docs/reports/assets/ui-redesign-YYYY-MM-DD/`:
- `login.png`, `dashboard.png`, `list.png`, `preview.png`, `wallet.png`

**Step 4: Final commit if evidence docs added**

```bash
git commit -m "docs(ui): redesign smoke evidence"
```

---

## Task order & estimates

| Task | Focus | Est. |
|------|--------|------|
| 1 | Tokens | 20–30m |
| 2 | Primitives | 30–45m |
| 3 | Chrome | 30–45m |
| 4 | Auth | 30m |
| 5 | Dashboard | 45–60m |
| 6 | List | 30m |
| 7 | Templates | 30–45m |
| 8 | Forms | 45m |
| 9 | Preview | 45m |
| 10 | Wallet | 30–45m |
| 11 | Purge | 30m |
| 12 | Verify | 30m |

**Total:** ~1–1.5 focused days. Do **not** parallelize Tasks 1–2 with screen work; screens depend on tokens/primitives.

## Explicit non-goals (restate)

- Pixel-perfect GoCar PDF (stamp path already owns that)
- New illustrations / brand mascot
- Light mode
- Admin redesign
- Replacing Tailwind/shadcn
- Micro-interaction libraries

## Rollback

Each task is a single commit. Revert last N commits if visual regresses:

```bash
git log --oneline -15
git revert <sha>   # prefer revert over reset on main
```

## Handoff notes for executor

- Prefer **class renames** over new abstractions beyond Task 2.
- When unsure between “pretty” and “quiet”, choose **quiet**.
- If a change requires touching `gocar-receipt-pdf.ts` or payment services — **stop**; out of scope.
- Ponytail: if a screen is already acceptable after tokens alone, skip deep restyle.

---

## Success definition

User (or reviewer) no longer describes the app as “kasar / template SaaS”: one accent, flat cards, readable type, single mobile chrome layer, honest draft/pay surfaces — while all money paths behave identically to pre-redesign.
