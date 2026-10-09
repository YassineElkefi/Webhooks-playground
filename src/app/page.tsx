
"use client";

import { useEffect, useMemo, useState } from "react";

type WebhookEvent = {
  id: string;
  type: string;
  createdAt: string;
  receivedAt: string;
  data: unknown;
};

type EventFilter = "all" | "payment" | "user" | "order";

const eventStyles: Record<string, string> = {
  "payment.succeeded": "text-emerald-400 bg-emerald-400/10",
  "payment.failed": "text-rose-400 bg-rose-400/10",
  "user.created": "text-sky-400 bg-sky-400/10",
  "order.created": "text-violet-400 bg-violet-400/10",
};

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString();
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

export default function Home() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connection, setConnection] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastReceived, setLastReceived] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");

    source.onopen = () => setConnection("connected");

    source.onerror = () => {
      setConnection(
        source.readyState === EventSource.CONNECTING
          ? "connecting"
          : "disconnected",
      );
    };

    source.addEventListener("snapshot", (rawEvent) => {
      const message = rawEvent as MessageEvent;
      const snapshot = JSON.parse(message.data) as WebhookEvent[];

      setEvents(snapshot);
      setLastReceived(snapshot[0]?.receivedAt ?? null);
      setSelectedId((current) => current ?? snapshot[0]?.id ?? null);
    });

    source.addEventListener("webhook", (rawEvent) => {
      const message = rawEvent as MessageEvent;
      const event = JSON.parse(message.data) as WebhookEvent;

      setEvents((current) => [
        event,
        ...current.filter((item) => item.id !== event.id),
      ].slice(0, 100));

      setSelectedId((current) => current ?? event.id);
      setLastReceived(event.receivedAt);
    });

    return () => source.close();
  }, []);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;

    return events.filter((event) =>
      event.type.startsWith(`${filter}.`),
    );
  }, [events, filter]);

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedId) ??
    filteredEvents[0] ??
    null;

  async function simulateEvent(type: string) {
    setSending(true);
    setNotice("");

    const id = `evt_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

    const data =
      type === "payment.succeeded" || type === "payment.failed"
        ? {
            paymentId: `pay_${crypto.randomUUID().slice(0, 8)}`,
            amount: Number((Math.random() * 200 + 10).toFixed(2)),
            currency: "TND",
            customer: "customer_demo",
          }
        : type === "user.created"
          ? {
              userId: `user_${crypto.randomUUID().slice(0, 8)}`,
              email: "demo@example.com",
              name: "Demo User",
            }
          : {
              orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
              total: Number((Math.random() * 500 + 20).toFixed(2)),
              currency: "TND",
              status: "created",
            };

    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          type,
          createdAt: new Date().toISOString(),
          data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setNotice(`Request failed (${response.status}): ${result.message}`);
      } else {
        setNotice(`Delivered to receiver: ${id}`);
      }
    } catch {
      setNotice("Could not reach the webhook receiver.");
    } finally {
      setSending(false);
    }
  }

  const counts = {
    total: events.length,
    payments: events.filter((event) => event.type.startsWith("payment.")).length,
    users: events.filter((event) => event.type.startsWith("user.")).length,
    orders: events.filter((event) => event.type.startsWith("order.")).length,
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl text-indigo-300 ring-1 ring-indigo-400/30">
              ↯
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Webhook Playground
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Inspect events as they arrive in real time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/3 px-3 py-2 text-sm sm:self-auto">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connection === "connected"
                  ? "animate-pulse bg-emerald-400"
                  : connection === "connecting"
                    ? "animate-pulse bg-amber-400"
                    : "bg-rose-400"
              }`}
            />
            <span className="text-slate-300">
              SSE {connection}
            </span>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total received",
              value: counts.total,
              description: "Events in memory",
              icon: "↯",
              color: "text-indigo-300",
            },
            {
              label: "Payments",
              value: counts.payments,
              description: "Payment events",
              icon: "$",
              color: "text-emerald-300",
            },
            {
              label: "Users",
              value: counts.users,
              description: "User events",
              icon: "◎",
              color: "text-sky-300",
            },
            {
              label: "Orders",
              value: counts.orders,
              description: "Order events",
              icon: "▤",
              color: "text-violet-300",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{stat.label}</p>
                <span className={`text-xl ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stat.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/2.5">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold">Event stream</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {filteredEvents.length} event
                  {filteredEvents.length === 1 ? "" : "s"} shown
                </p>
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as EventFilter)
                }
                className="rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Filter events"
              >
                <option value="all">All events</option>
                <option value="payment">Payments</option>
                <option value="user">Users</option>
                <option value="order">Orders</option>
              </select>
            </div>

            <div className="max-h-140 overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl text-slate-400">
                    ↯
                  </div>
                  <h3 className="mt-4 font-medium">Waiting for events</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                    Trigger a test event on the right, or send a POST request
                    to your webhook endpoint.
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedId(event.id)}
                    className={`block w-full border-b border-white/6 p-5 text-left transition hover:bg-white/4 ${
                      selectedEvent?.id === event.id
                        ? "bg-indigo-500/8 ring-1 ring-inset ring-indigo-400/30"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                            eventStyles[event.type] ??
                            "bg-slate-400/10 text-slate-300"
                          }`}
                        >
                          {event.type}
                        </span>
                        <p className="mt-3 truncate font-mono text-xs text-slate-400">
                          {event.id}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatTime(event.receivedAt)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/2.5 p-5">
              <div>
                <h2 className="font-semibold">Event simulator</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Generate a sample event and send it to your actual webhook
                  endpoint.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    type: "payment.succeeded",
                    label: "Payment succeeded",
                    color: "border-emerald-400/20 hover:bg-emerald-400/10",
                  },
                  {
                    type: "payment.failed",
                    label: "Payment failed",
                    color: "border-rose-400/20 hover:bg-rose-400/10",
                  },
                  {
                    type: "user.created",
                    label: "User created",
                    color: "border-sky-400/20 hover:bg-sky-400/10",
                  },
                  {
                    type: "order.created",
                    label: "Order created",
                    color: "border-violet-400/20 hover:bg-violet-400/10",
                  },
                ].map((item) => (
                  <button
                    key={item.type}
                    disabled={sending}
                    onClick={() => simulateEvent(item.type)}
                    className={`rounded-xl border bg-white/2 px-3 py-3 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${item.color}`}
                  >
                    {sending ? "Sending..." : item.label}
                  </button>
                ))}
              </div>

              {notice && (
                <p
                  role="status"
                  className="mt-4 wrap-break-word rounded-lg bg-white/4 p-3 text-xs leading-5 text-slate-300"
                >
                  {notice}
                </p>
              )}

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Webhook endpoint
                </p>
                <code className="mt-2 block break-all text-sm text-indigo-300">
                  POST /api/webhooks
                </code>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  The receiver acknowledges the request before the browser
                  gets the event through SSE.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/2.5 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Event details</h2>
                {selectedEvent && (
                  <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400">
                    JSON
                  </span>
                )}
              </div>

              {selectedEvent ? (
                <>
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Event ID</p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-300">
                        {selectedEvent.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Received at</p>
                      <p className="mt-1 text-slate-300">
                        {formatDate(selectedEvent.receivedAt)}
                      </p>
                    </div>
                  </div>
                  <pre className="mt-5 max-h-80 overflow-auto rounded-xl border border-white/[0.07] bg-black/30 p-4 text-xs leading-6 text-emerald-200">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  Select an event to inspect its payload.
                </p>
              )}
            </div>
          </div>
        </section>

        <footer className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Webhook Playground · Local development</p>
          <p>
            Last event received:{" "}
            {lastReceived ? formatDate(lastReceived) : "No events yet"}
          </p>
        </footer>
      </div>
    </main>
  );
}