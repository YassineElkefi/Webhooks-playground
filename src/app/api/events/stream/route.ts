
import { getEvents, subscribe } from "@/lib/events";

export async function GET() {
  const encoder = new TextEncoder();

  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      function send(data: unknown, eventName = "webhook") {
        if (closed) return;

        try {
          controller.enqueue(
            encoder.encode(
              `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          cleanup();
        }
      }

      const unsubscribe = subscribe((event) => send(event));

      // Send the current event history to this browser.
      send(getEvents(), "snapshot");

      const heartbeat = setInterval(() => {
        if (closed) return;

        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, 15_000);

      cleanup = () => {
        if (closed) return;

        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
      };
    },

    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}