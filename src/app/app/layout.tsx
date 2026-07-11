import { requireUser } from "@/modules/auth";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import {
  FileText,
  Layers,
  Wallet,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await requireUser();

  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  let localUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { wallet: true },
  });

  if (!localUser) {
    localUser = await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email || "",
        fullName: supabaseUser?.user_metadata?.name || null,
        role: "user",
        wallet: { create: {} },
      },
      include: { wallet: true },
    });
  }

  const navigation = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Template", href: "/app/templates", icon: Layers },
    { name: "AI Generator", href: "/app/ai-invoice-generator", icon: Sparkles },
    { name: "Dokumen", href: "/app/invoices", icon: FileText },
    { name: "Dompet", href: "/app/wallet", icon: Wallet },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-100 selection:bg-indigo-500 selection:text-white">
      <header className="sticky top-0 z-50 hidden border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/app" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                DokMaker
              </span>
            </Link>
            <nav className="flex items-center gap-1.5">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-100"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <UserNav user={localUser} />
        </div>
      </header>

      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-tr from-indigo-500 to-purple-500">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-base font-bold tracking-tight text-transparent">
              DokMaker
            </span>
          </Link>
          <MobileNav user={localUser} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:px-6 md:pb-8">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
