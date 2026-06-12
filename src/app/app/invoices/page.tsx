import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { listInvoices } from "@/modules/invoices/service";

export default async function InvoicesPage() {
  const user = await requireUser();
  const invoices = await listInvoices(user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoice Saya</h1>
        <Link
          href="/app/templates"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Buat Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">Belum ada invoice.</p>
          <Link
            href="/app/templates"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Pilih template untuk membuat invoice pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const latestVersion = invoice.versions[0];
            return (
              <Link
                key={invoice.id}
                href={`/app/invoices/${invoice.id}/edit`}
                className="block rounded-lg border bg-white p-4 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">
                      {invoice.template.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        latestVersion?.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {latestVersion?.status === "paid" ? "Sudah Bayar" : "Belum Bayar"}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">
                      v{latestVersion?.versionNumber}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
