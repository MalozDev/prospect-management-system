/**
 * Run side-effect operations AFTER the response has been sent to the client.
 * Uses `setImmediate` which fires after I/O callbacks (including response
 * flushing), ensuring the user gets their HTTP response before any
 * non-critical work begins.
 *
 * All side effects (activity logs, notifications, supervisor alerts,
 * superadmin alerts) should go through this so the user gets their
 * API response as fast as possible.
 *
 * IMPORTANT: This is for non-critical side effects ONLY.
 * Operations that affect the primary entity returned to the user
 * (e.g., prospect status updates) must run synchronously BEFORE
 * the response to avoid data inconsistency if the client disconnects.
 */

export function defer(
  fn: () => Promise<void>,
  signal?: AbortSignal
): void {
  // setImmediate fires after I/O callbacks (including response flush),
  // which is more reliable than queueMicrotask for post-response work.
  setImmediate(async () => {
    if (signal?.aborted) return;
    try {
      await fn();
    } catch {
      // Side effects are best-effort — never throw
    }
  });
}
