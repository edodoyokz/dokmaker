import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/db/prisma";
import { creditWallet, debitWallet } from "@/modules/wallet/service";
import { writeAuditLog } from "@/modules/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { userId } = await params;
    const body = await request.json();
    const { type, amount, reason } = body;

    if (!type || !amount || !reason) {
      return NextResponse.json(
        { error: "Type, amount, dan reason wajib diisi" },
        { status: 400 }
      );
    }

    if (type !== "credit" && type !== "debit") {
      return NextResponse.json(
        { error: "Type harus credit atau debit" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount harus lebih dari 0" },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    const idempotencyKey = `admin-adjust:${admin.id}:${userId}:${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      if (type === "credit") {
        await creditWallet(
          tx,
          userId,
          amount,
          "manual_adjustment_credit",
          idempotencyKey,
          "admin_adjustment",
          admin.id,
          reason,
          "admin",
          admin.id
        );
      } else {
        await debitWallet(
          tx,
          userId,
          amount,
          "manual_adjustment_debit",
          idempotencyKey,
          "admin_adjustment",
          admin.id,
          reason,
          "admin",
          admin.id
        );
      }

      // Audit log
      await writeAuditLog(tx, {
        adminUserId: admin.id,
        action: `manual_adjustment_${type}`,
        targetType: "wallet",
        targetId: userId,
        detail: { amount, reason },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
