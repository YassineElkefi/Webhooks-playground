
import { NextRequest, NextResponse } from "next/server";
import { signPayload } from "@/lib/signature";

export async function POST(request: NextRequest) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid simulator request" },
      { status: 400 },
    );
  }

  if (
    typeof input !== "object" ||
    input === null ||
    !("payload" in input) ||
    typeof input.payload !== "object" ||
    input.payload === null
  ) {
    return NextResponse.json(
      { message: "Expected a payload object" },
      { status: 400 },
    );
  }

  const payload = JSON.stringify(input.payload);

  let signature: string;

  try {
    signature = signPayload(payload);
  } catch {
    return NextResponse.json(
      { message: "Webhook signing is not configured" },
      { status: 500 },
    );
  }

  try {
    const receiverUrl = new URL("/api/webhooks", request.url);

    const response = await fetch(receiverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
        "x-simulate-failure":
          "simulateFailure" in input && input.simulateFailure === true
            ? "true"
            : "false",
      },
      body: payload,
      cache: "no-store",
    });

    const responseBody = await response.json();

    return NextResponse.json(responseBody, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { message: "Could not reach the webhook receiver" },
      { status: 502 },
    );
  }
}