import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import { Dashboard } from "@/components/dashboard";
import { documentPartyName } from "@/modules/documents/display-name";

export default async function AppPage() {
  const authUser = await requireUser();

  // Get local user with wallet
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { wallet: true },
  });

  if (!user || !user.wallet) {
    return <div>User not found</div>;
  }

  // Get recent invoices with versions
  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  // Get recent transactions
  const transactions = await prisma.walletLedgerEntry.findMany({
    where: { walletId: user.wallet.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <Dashboard
      user={{
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      }}
      wallet={{
        currentBalance: user.wallet.currentBalance,
      }}
      recentInvoices={invoices.map((inv) => {
        const content = inv.versions[0]?.contentSnapshot;
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || inv.title || "Dokumen",
          clientName: documentPartyName(content),
          documentType: inv.documentType,
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
        };
      })}
      recentTransactions={transactions.map((tx) => ({
        id: tx.id,
        entryType: tx.entryType,
        amount: tx.amount,
        description: tx.description,
        createdAt: tx.createdAt.toISOString(),
      }))}
    />
  );
}
