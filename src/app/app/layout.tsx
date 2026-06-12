import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import LogoutButton from "@/components/auth/logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/app" className="text-lg font-bold">
            DokMaker
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden w-56 border-r bg-white py-4 md:block">
          <nav className="space-y-1 px-3">
            <NavLink href="/app" label="Dashboard" />
            <NavLink href="/app/templates" label="Template" />
            <NavLink href="/app/invoices" label="Invoice" />
            <NavLink href="/app/wallet" label="Wallet" />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    >
      {label}
    </Link>
  );
}
