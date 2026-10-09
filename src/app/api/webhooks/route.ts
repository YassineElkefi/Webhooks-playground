import { NextRequest, NextResponse } from "next/server";
import { addEvent } from "@/lib/events";
import { verifySignature } from "@/lib/signature";

export async function POST(request: NextRequest) {

  // Read the original bytes as text before parsing JSON.
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  try {
    if (!verifySignature(rawBody, signature)){
      return NextResponse.json(
        { success: false, message: "Invalid webhook signature"},
        { status: 401 },
      );
    }
  } catch {
      return NextResponse.json(
        { success: false, message: "Webhook signing is not configured" },
        { status: 500 },
      );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    typeof body.id !== "string" ||
    !("type" in body) ||
    typeof body.type !== "string" ||
    !("data" in body)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Expected id, type, and data fields",
      },
      { status: 400 },
    );
  }


  // Learning-only failure simulation.
  if (request.headers.get("x-simulate-failure") === "true") {
    return NextResponse.json(
      {
        success: false,
        message: "Simulated temporary receiver failure",
      },
      { status: 500 },
    );
  }

  const event = {
    id: body.id,
    type: body.type,
    createdAt:
      "createdAt" in body && typeof body.createdAt === "string"
        ? body.createdAt
        : new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    data: body.data,
  };

  const isNewEvent = addEvent(event);
  if(!isNewEvent) {
    return NextResponse.json(
      {
        success: true,
        duplicate: true,
        message: "Event already processed",
        eventId: event.id
      },
      { status: 200 }
    );
  }

    console.log("📩 Verified Webhook", event.id, event.type);


  return NextResponse.json(
    {
      success: true,
      message: "Webhook received successfully",
      eventId: event.id,
      receivedAt: event.receivedAt,
    },
    { status: 200 },
  );
}