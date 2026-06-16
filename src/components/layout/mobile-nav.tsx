"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Layers, 
  FileText, 
  Wallet, 
  ShieldAlert, 
  LogOut 
} from "lucide-react";

interface MobileNavProps {
  user: {
    email: string;
    fullName: string | null;
    role: string;
  };
}

export function MobileNav({ user }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navigation = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Template", href: "/app/templates", icon: Layers },
    { name: "Invoice", href: "/app/invoices", icon: FileText },
    { name: "Dompet", href: "/app/wallet", icon: Wallet },
  ];

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" />
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="h-6 w-6 text-zinc-400"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </SheetTrigger>
      <SheetContent className="bg-zinc-950 border-l border-zinc-900 text-zinc-100 flex flex-col p-6 max-w-[280px]">
        <SheetHeader className="border-b border-zinc-900 pb-4">
          <SheetTitle className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Navigasi</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-6 py-4 flex-1">
          {/* User Section */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-900">
            <div className="h-10 w-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm shrink-0">
              {user.fullName
                ? user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-zinc-200 truncate">
                {user.fullName || "User"}
              </span>
              <span className="text-xs text-zinc-550 truncate">
                {user.email}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent"
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.name}
                </Link>
              );
            })}

            {user.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-purple-450 hover:text-purple-300 hover:bg-purple-950/10 border border-transparent hover:border-purple-500/20 transition-all"
              >
                <ShieldAlert className="h-4.5 w-4.5" />
                Admin Panel
              </Link>
            )}
          </div>
        </div>

        {/* Footer with logout */}
        <div className="pt-4 border-t border-zinc-900">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-xl py-5"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
