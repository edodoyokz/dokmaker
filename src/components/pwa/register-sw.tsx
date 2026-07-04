"use client";

import { useEffect } from "react";

/**
 * Registers the DokMaker service worker.
 *
 * Only registered in production to avoid caching surprises during development.
 * The SW itself (public/sw.js) is shell-only and never caches private data
 * (invoices, wallet, payments, downloads) — see AGENTS.md §2.
 */
export function RegisterSw() {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration is best-effort; never block the UI on it.
      });
    }
  }, []);

  return null;
}
