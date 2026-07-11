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
import { cn } from "@/lib/utils";

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950 md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-1">
        <NavItem href="/app" icon={Home} label="Home" pathname={pathname} exact />
        <NavItem href="/app/templates" icon={Layers} label="Template" pathname={pathname} />
        <NavItem href="/app/templates" icon={Plus} label="Baru" pathname={pathname} forceInactive />
        <NavItem href="/app/invoices" icon={FileText} label="Dokumen" pathname={pathname} />
        <NavItem href="/app/wallet" icon={Wallet} label="Dompet" pathname={pathname} />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  pathname,
  exact,
  forceInactive,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  pathname: string;
  exact?: boolean;
  forceInactive?: boolean;
}) {
  const active = forceInactive
    ? false
    : exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-xs font-medium",
        active ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
