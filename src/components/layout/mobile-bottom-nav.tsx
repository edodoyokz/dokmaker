"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  Layers,
  Plus,
  Wallet,
} from "lucide-react";

/**
 * App chrome bottom nav. Hidden on long form / checkout screens so sticky
 * CTAs (preview buy, form save) own the bottom edge.
 */
export function MobileBottomNav() {
  const pathname = usePathname() || "";
  const hide =
    pathname.includes("/preview") ||
    pathname.includes("/edit") ||
    pathname.includes("/invoices/new") ||
    pathname.includes("/documents/new") ||
    pathname.includes("/wallet/topup");

  if (hide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-zinc-950/90 px-2 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        <NavItem href="/app" icon={Home} label="Home" />
        <NavItem href="/app/templates" icon={Layers} label="Template" />
        <Link
          href="/app/templates"
          className="relative flex -translate-y-4 flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-950 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/35 hover:from-indigo-500 hover:to-purple-500">
            <Plus className="h-6 w-6" />
          </div>
          <span className="mt-1 translate-y-1">Baru</span>
        </Link>
        <NavItem href="/app/invoices" icon={FileText} label="Dokumen" />
        <NavItem href="/app/wallet" icon={Wallet} label="Dompet" />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400"
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
