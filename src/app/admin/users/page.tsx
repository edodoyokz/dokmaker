import Link from "next/link";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      wallet: true,
      _count: { select: { invoices: true, paymentTransactions: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="p-3">Email</th>
                <th className="p-3">Nama</th>
                <th className="p-3">Role</th>
                <th className="p-3">Saldo</th>
                <th className="p-3">Invoices</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.fullName || "-"}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    Rp
                    {(user.wallet?.currentBalance ?? 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3">{user._count.invoices}</td>
                  <td className="p-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
