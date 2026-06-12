import { NextResponse } from "next/server";
import { handlePakasirWebhook } from "@/modules/payments/pakasir";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.project || !body.order_id || !body.amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await handlePakasirWebhook(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Pakasir webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 400 }
    );
  }
}
