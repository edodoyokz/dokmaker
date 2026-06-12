"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface MobileNavProps {
  user: {
    email: string;
    fullName: string | null;
    role: string;
  };
}

export function MobileNav({ user }: MobileNavProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="ghost" size="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-6 w-6"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{user.fullName || "User"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Separator />
          <Link href="/app" className="text-sm font-medium">
            Dashboard
          </Link>
          <Link href="/app/templates" className="text-sm font-medium">
            Template
          </Link>
          <Link href="/app/invoices" className="text-sm font-medium">
            Invoice
          </Link>
          <Link href="/app/wallet" className="text-sm font-medium">
            Dompet
          </Link>
          {user.role === "admin" && (
            <>
              <Separator />
              <Link href="/admin" className="text-sm font-medium">
                Admin Panel
              </Link>
            </>
          )}
          <Separator />
          <Button variant="outline" onClick={handleLogout}>
            Keluar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
