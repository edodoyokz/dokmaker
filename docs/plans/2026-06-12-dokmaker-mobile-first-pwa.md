# DokMaker Mobile-First PWA Requirements

**Version:** v1.0  
**Status:** Final product requirement addition  
**Date:** 2026-06-12

---

## 1. Decision

DokMaker MVP must be built as a **mobile-first Progressive Web App (PWA)**.

This means:
- all primary user flows must work well on mobile screens first
- the app should be installable on supported browsers/devices
- core routes should have PWA metadata and manifest
- offline/poor-network states must be handled gracefully
- document/payment flows must remain server-authoritative and must not rely on offline financial actions

---

## 2. Mobile-first scope

### Must be optimized for mobile
- landing page
- register/login
- user dashboard
- template catalog
- invoice editor
- invoice preview
- wallet/top up
- payment return/status page
- final download flow
- transaction history

### Admin scope
Admin pages should be responsive enough to use on tablet/desktop. Admin is not the primary mobile-first target for MVP.

---

## 3. Mobile UX rules

### Layout
- Design for 360px width first.
- Use single-column layout for primary user flows.
- Avoid dense tables on mobile; use cards/lists.
- Use sticky bottom CTA where useful:
  - save draft
  - preview
  - download final
  - top up
- Keep touch targets at least 44px height.
- Avoid hover-only interactions.

### Invoice editor
- Use sectioned form UI:
  1. sender
  2. client
  3. invoice meta
  4. items
  5. summary
  6. notes/payment instruction
- Line items must be easy to add/edit/remove on mobile.
- Totals should stay visible or summarized near CTA.
- Validation errors must appear near fields.

### Preview
- Preview must fit mobile screen with zoom/scroll behavior.
- Watermark must remain visible on mobile.
- User must clearly understand preview is not final.

### Wallet/top up
- Show top up packages as large tappable cards:
  - Rp50.000
  - Rp100.000
- Show current balance clearly.
- Payment redirect to Pakasir must work from mobile browsers.

---

## 4. PWA requirements

### Required files/config
- `public/manifest.webmanifest` or equivalent
- app icons in multiple sizes
- theme color
- mobile viewport metadata
- service worker strategy if enabled
- installable app metadata

### Manifest minimum
```json
{
  "name": "DokMaker",
  "short_name": "DokMaker",
  "description": "Buat invoice profesional dari template siap pakai.",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#111827",
  "icons": []
}
```

### PWA caching strategy
Recommended MVP strategy:
- cache static assets and app shell only
- do not cache private API responses by default
- do not cache final PDF URLs as public offline assets
- do not allow offline wallet/payment mutation
- show explicit offline state for network-required actions

### Offline behavior
Allowed offline/poor-network behavior:
- app shell loads if previously visited
- static pages/assets may load
- user sees clear offline banner

Blocked offline behavior:
- top up
- Pakasir payment verification
- final paid download
- wallet mutation
- invoice save if no reliable sync strategy exists

MVP recommendation:
- do not implement offline invoice editing persistence unless explicitly scoped later
- show “Koneksi internet diperlukan” for save/payment/download actions when offline

---

## 5. Technical recommendations

### Next.js PWA
Use one of:
- `next-pwa`
- custom service worker
- framework-native metadata + manifest support

For MVP, prefer minimal PWA:
- manifest
- icons
- installable metadata
- conservative service worker caching

Avoid aggressive caching that could leak user data or show stale financial state.

### Responsive implementation
- Tailwind responsive utilities
- mobile-first CSS classes
- card-based lists
- drawer/sheet components for mobile navigation
- bottom navigation or compact sidebar for user area

---

## 6. PWA/security constraints

- Never cache authenticated API responses containing invoices, wallet, payments, or user data unless encrypted and deliberately designed.
- Never cache Pakasir API secrets.
- Never expose Pakasir API key to service worker/client.
- Service worker must not replay payment or wallet mutation requests automatically.
- Signed final PDF URLs must remain temporary and protected.

---

## 7. Acceptance criteria

MVP mobile-first PWA is acceptable when:
1. primary user flow works on 360px mobile viewport
2. no horizontal overflow in main user pages
3. touch targets are usable
4. invoice editor is usable on mobile
5. preview is readable with scroll/zoom behavior
6. top up package cards are easy to tap
7. app has valid web manifest
8. app is installable on supported browser/device
9. offline state is handled safely
10. financial/private data is not improperly cached

---

## 8. Required tests/checks

### Manual viewport checks
- 360x740
- 390x844
- 412x915
- tablet width
- desktop width

### PWA checks
- Lighthouse PWA audit
- manifest loads
- icons load
- install prompt/standalone display works where supported
- service worker, if enabled, does not cache private API responses

### Critical mobile smoke flow
1. open app on mobile viewport
2. login
3. choose template
4. create invoice
5. preview invoice
6. top up via Pakasir redirect
7. return to app
8. download final PDF
9. re-download same version
