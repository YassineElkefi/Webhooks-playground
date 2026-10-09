
export type WebhookEvent = {
  id: string;
  type: string;
  createdAt: string;
  receivedAt: string;
  data: unknown;
};

type EventListener = (event: WebhookEvent) => void;

const events: WebhookEvent[] = [];
const processedIds = new Set<string>();
const listeners = new Set<EventListener>();

export function getEvents(): WebhookEvent[] {
  return [...events];
}

export function addEvent(event: WebhookEvent): boolean {
  // Reject an event that has already been processed.
  if (processedIds.has(event.id)){
    return false;
  }

  processedIds.add(event.id);
  events.unshift(event);

  // Keep the latest 100 events.
  if (events.length > 100) {
    events.length = 100;
  }

  // Notify every connected SSE client.
  for (const listener of listeners) {
    listener(event);
  }

  return true;
}

export function subscribe(listener: EventListener) {
  listeners.add(listener);

  // Return a function that disconnects this subscriber.
  return () => {
    listeners.delete(listener);
  };
}