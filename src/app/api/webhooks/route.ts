import { NextRequest, NextResponse } from "next/server";
import { addEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
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

  console.log("📩 Webhook received:", event.id, event.type);

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