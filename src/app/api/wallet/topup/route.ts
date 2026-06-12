import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth/session";
import { createTopUpPayment } from "@/modules/payments/pakasir";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number") {
      return NextResponse.json(
        { error: "Amount wajib diisi" },
        { status: 400 }
      );
    }

    const result = await createTopUpPayment(user.id, amount);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
