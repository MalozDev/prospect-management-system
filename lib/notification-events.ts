/**
 * In-memory registry of active SSE (Server-Sent Events) connections.
 *
 * Maps userId → Set of ReadableStream controllers so we can push
 * real-time events to all connected clients for that user.
 *
 * Note: This is an in-process registry. If you scale to multiple
 * server instances, replace this with Redis pub/sub. For single-server
 * deployments (or local dev) this works perfectly.
 */
const sseClients = new Map<string, Set<ReadableStreamDefaultController>>();

export function addSseClient(
  userId: string,
  controller: ReadableStreamDefaultController
): void {
  let clients = sseClients.get(userId);
  if (!clients) {
    clients = new Set();
    sseClients.set(userId, clients);
  }
  clients.add(controller);
}

export function removeSseClient(
  userId: string,
  controller: ReadableStreamDefaultController
): void {
  const clients = sseClients.get(userId);
  if (!clients) return;
  clients.delete(controller);
  if (clients.size === 0) {
    sseClients.delete(userId);
  }
}

/**
 * Emit an SSE event to all connected clients for a given userId.
 * Data is JSON-stringified automatically.
 */
export function emitSseEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>
): void {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;

  const encoder = new TextEncoder();
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const controller of clients) {
    try {
      controller.enqueue(encoder.encode(message));
    } catch {
      // Client disconnected — will be cleaned up on next removeSseClient call
      clients.delete(controller);
    }
  }

  if (clients.size === 0) {
    sseClients.delete(userId);
  }
}

/**
 * Returns the count of active SSE connections (for monitoring).
 */
export function getActiveConnectionCount(): number {
  let count = 0;
  for (const clients of sseClients.values()) {
    count += clients.size;
  }
  return count;
}
