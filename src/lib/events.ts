
export type WebhookEvent = {
  id: string;
  type: string;
  createdAt: string;
  receivedAt: string;
  data: unknown;
};

type EventListener = (event: WebhookEvent) => void;

const events: WebhookEvent[] = [];
const listeners = new Set<EventListener>();

export function getEvents() {
  return [...events];
}

export function addEvent(event: WebhookEvent) {
  events.unshift(event);

  // Keep the latest 100 events.
  if (events.length > 100) {
    events.length = 100;
  }

  // Notify every connected SSE client.
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribe(listener: EventListener) {
  listeners.add(listener);

  // Return a function that disconnects this subscriber.
  return () => {
    listeners.delete(listener);
  };
}