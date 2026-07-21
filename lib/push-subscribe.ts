import { getToken } from "./api-client";

/**
 * Build the auth headers needed for push subscription API calls.
 * The /api/push/subscribe endpoint requires a valid Bearer token.
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Auto-subscribe the browser to push notifications.
 * Call this after login/register. Non-blocking — never throws.
 *
 * Steps:
 * 1. Check if push + service worker are supported
 * 2. Get the VAPID public key from the server
 * 3. Get the service worker registration
 * 4. Subscribe to push via the browser's PushManager
 * 5. Send the subscription to our server
 */
export async function subscribeToPush(): Promise<void> {
  // Check browser support
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return;
  }

  // Don't ask — only auto-subscribe if permission was already granted
  if (Notification.permission !== "granted") return;

  try {
    // Get VAPID public key from server
    const keyRes = await fetch("/api/push/vapid-public-key");
    const keyData = await keyRes.json();
    if (!keyData.publicKey) return;

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      // Already subscribed — still send to server in case server lost it
      const subJson = existingSub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });
      return;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyData.publicKey,
    });

    // Send subscription to server
    const subJson = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
      }),
    });
  } catch {
    // Silent fail — push subscription is best-effort
  }
}
