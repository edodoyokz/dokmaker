import { requireUser } from "@/modules/auth";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { 
  FileText, 
  Layers, 
  Plus, 
  Wallet, 
  Home, 
  LayoutDashboard 
} from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await requireUser();

  // Get Supabase user for metadata
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Ensure local user exists
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
    { name: "Invoice", href: "/app/invoices", icon: FileText },
    { name: "Dompet", href: "/app/wallet", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Desktop Header */}
      <header className="hidden md:block border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/app" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                DokMaker
              </span>
            </Link>
            <nav className="flex items-center gap-1.5">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <UserNav user={localUser} />
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              DokMaker
            </span>
          </Link>
          <MobileNav user={localUser} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}

function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md md:hidden px-4">
      <div className="flex h-16 items-center justify-around max-w-md mx-auto">
        <Link
          href="/app"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        
        <Link
          href="/app/templates"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <Layers className="h-5 w-5" />
          <span>Template</span>
        </Link>
        
        <Link
          href="/app/invoices/new"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400 relative -translate-y-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/35 border-2 border-zinc-950">
            <Plus className="h-6 w-6" />
          </div>
          <span className="mt-1 translate-y-1">Baru</span>
        </Link>
        
        <Link
          href="/app/invoices"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <FileText className="h-5 w-5" />
          <span>Invoice</span>
        </Link>
        
        <Link
          href="/app/wallet"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <Wallet className="h-5 w-5" />
          <span>Dompet</span>
        </Link>
      </div>
    </nav>
  );
}
