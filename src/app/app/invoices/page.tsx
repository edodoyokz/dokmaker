import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Plus, 
  Eye, 
  Edit3, 
  Calendar, 
  User 
} from "lucide-react";

export default async function InvoicesPage() {
  const authUser = await requireUser();

  const invoices = await prisma.invoice.findMany({
    where: { userId: authUser.id },
    orderBy: { createdAt: "desc" },
    include: { 
      template: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full text-xs">
            Lunas
          </Badge>
        );
      case "unpaid":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">
            Belum Bayar
          </Badge>
        );
      case "processing_payment":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 px-2 py-0.5 rounded-full text-xs animate-pulse">
            Diproses
          </Badge>
        );
      default:
        return (
          <Badge className="bg-zinc-800 text-zinc-450 border border-zinc-700 px-2 py-0.5 rounded-full text-xs">
            {status}
          </Badge>
        );
    }
  };

  const getClientName = (invoice: typeof invoices[0]) => {
    const content = invoice.versions[0]?.contentSnapshot as Record<string, unknown>;
    return (content?.client as Record<string, unknown>)?.name as string || "Klien Tanpa Nama";
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Invoice Saya <FileText className="h-5 w-5 text-indigo-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Daftar lengkap invoice yang telah Anda buat beserta statusnya.
          </p>
        </div>
        <Link 
          href="/app/templates" 
          className={cn(buttonVariants(), "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 rounded-xl shadow-md")}
        >
          <Plus className="mr-2 h-4 w-4" /> Buat Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl">
          <CardContent className="py-16 text-center flex flex-col items-center justify-center">
            <FileText className="h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">Belum Ada Invoice</p>
            <p className="text-xs text-zinc-500 mt-1">Anda belum membuat invoice draf atau versi final.</p>
            <Link 
              href="/app/templates" 
              className={cn(buttonVariants({ size: "sm" }), "mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl")}
            >
              Pilih Template
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card 
              key={invoice.id}
              className="border-zinc-800 bg-zinc-900/40 backdrop-blur-md hover:border-zinc-700 hover:bg-zinc-900/50 transition-all rounded-xl overflow-hidden"
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-zinc-200 tracking-tight">
                        {invoice.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({invoice.template.name})
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                        {getClientName(invoice)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        {new Date(invoice.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 border-zinc-800/60 pt-3 sm:pt-0">
                    <div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/invoices/${invoice.id}/preview`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 rounded-xl px-3 h-9 text-xs flex items-center gap-1.5"
                        )}
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </Link>
                      
                      <Link
                        href={`/app/invoices/${invoice.id}/edit`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl px-3 h-9 text-xs flex items-center gap-1.5"
                        )}
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
