
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    console.log("📩 Webhook received!");
    console.log("Payload:", body);

    return NextResponse.json(
      {
        success: true,
        message: "Webhook received successfully",
        receivedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid JSON payload",
      },
      { status: 400 },
    );
  }
}