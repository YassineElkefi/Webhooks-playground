
import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(payload: string): string {
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("WEBHOOK_SECRET is not configured");
  }

  return createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
}

export function verifySignature(
  payload: string,
  signature: string | null,
): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = Buffer.from(signPayload(payload), "hex");
  const received = Buffer.from(signature, "hex");

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}