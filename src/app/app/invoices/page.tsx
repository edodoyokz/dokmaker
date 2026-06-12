import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        return <Badge variant="default">Lunas</Badge>;
      case "unpaid":
        return <Badge variant="secondary">Belum Bayar</Badge>;
      case "processing_payment":
        return <Badge variant="outline">Diproses</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getClientName = (invoice: typeof invoices[0]) => {
    const content = invoice.versions[0]?.contentSnapshot as Record<string, unknown>;
    return (content?.client as Record<string, unknown>)?.name as string || "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoice Saya</h1>
        <Link href="/app/invoices/new" className={cn(buttonVariants())}>
          Buat Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Anda belum memiliki invoice
            </p>
            <Link href="/app/templates" className={cn(buttonVariants())}>
              Pilih Template
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {getClientName(invoice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.template.name} •{" "}
                      {new Date(invoice.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invoice.status)}
                    <Link
                      href={`/app/invoices/${invoice.id}/preview`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Preview
                    </Link>
                    <Link
                      href={`/app/invoices/${invoice.id}/edit`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      Edit
                    </Link>
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
