import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  documentPartyName,
  documentTypeBadgeLabel,
} from "@/modules/documents/display-name";
import { FileText, Plus, Eye, Edit3, Calendar, User } from "lucide-react";

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
          <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/20">
            Lunas
          </Badge>
        );
      case "unpaid":
        return (
          <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-500/20">
            Belum Bayar
          </Badge>
        );
      case "processing_payment":
        return (
          <Badge className="animate-pulse rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400 hover:bg-indigo-500/20">
            Diproses
          </Badge>
        );
      case "draft":
        return (
          <Badge className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            Draf
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-100">
            Dokumen Saya <FileText className="h-5 w-5 text-indigo-400" />
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Daftar draf dan dokumen final Anda.
          </p>
        </div>
        <Link
          href="/app/templates"
          className={cn(
            buttonVariants(),
            "shrink-0 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:from-indigo-500 hover:to-purple-500"
          )}
        >
          <Plus className="mr-2 h-4 w-4" /> Buat dokumen
        </Link>
      </div>

      {invoices.length === 0 ? (
        <Card className="rounded-2xl border-zinc-800 bg-zinc-900/30 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-2 h-10 w-10 text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-300">
              Belum ada dokumen
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Pilih template untuk membuat draf pertama.
            </p>
            <Link
              href="/app/templates"
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
              )}
            >
              Pilih template
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => {
            const party = documentPartyName(
              invoice.versions[0]?.contentSnapshot
            );
            const typeLabel = documentTypeBadgeLabel(invoice.documentType);
            const title =
              invoice.title ||
              invoice.invoiceNumber ||
              invoice.template.name ||
              "Dokumen";

            return (
              <Card
                key={invoice.id}
                className="overflow-hidden rounded-xl border-zinc-800 bg-zinc-900/40 backdrop-blur-md transition-all hover:border-zinc-700 hover:bg-zinc-900/50"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-extrabold tracking-tight text-zinc-200">
                          {title}
                        </span>
                        <Badge className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0 text-[10px] font-semibold text-zinc-400">
                          {typeLabel}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-zinc-500" />
                          {party}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                          {new Date(invoice.createdAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                        <span className="truncate text-[10px] text-zinc-600">
                          {invoice.template.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3.5 border-t border-zinc-800/60 pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
                      {getStatusBadge(invoice.status)}

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/invoices/${invoice.id}/preview`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "flex h-9 items-center gap-1.5 rounded-xl border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300 hover:bg-zinc-900"
                          )}
                        >
                          <Eye className="h-3.5 w-3.5" /> Pratinjau
                        </Link>

                        <Link
                          href={`/app/invoices/${invoice.id}/edit`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                          )}
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
