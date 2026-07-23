/**
 * Register the browser for push notifications via the standard Web Push API.
 *
 * Uses the PushManager API (`navigator.serviceWorker.pushManager.subscribe()`)
 * with the application's VAPID public key. This works on all modern browsers:
 *   - Chrome (Android, Desktop)
 *   - Firefox (Android, Desktop)
 *   - Safari 16.4+ (iOS, macOS)
 *   - Edge
 *   - Samsung Internet
 *
 * The VAPID public key is fetched from the server on first call and cached.
 */

import { getToken } from "./api-client";

/** Cache the VAPID public key after first fetch */
let vapidPublicKey: string | null = null;

/** Cache the fetch promise so concurrent calls are deduplicated */
let vapidKeyPromise: Promise<string | null> | null = null;

/**
 * Fetch the VAPID public key from the server.
 * Results are cached so this only makes one network request.
 */
async function getVapidPublicKey(): Promise<string | null> {
  if (vapidPublicKey) return vapidPublicKey;

  if (!vapidKeyPromise) {
    vapidKeyPromise = (async () => {
      try {
        const res = await fetch("/api/push/vapid-public-key");
        if (!res.ok) return null;
        const data = await res.json();
        vapidPublicKey = data.publicKey;
        return vapidPublicKey;
      } catch {
        return null;
      }
    })();
  }

  return vapidKeyPromise;
}

/**
 * Convert a base64url string to a Uint8Array.
 * Required by PushManager.subscribe() for the applicationServerKey param.
 */
function urlBase64ToUint8Array(base64url: string): Uint8Array {
  // Replace URL-safe chars and pad
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";

  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Subscribe the browser to push notifications.
 * Must be called after notification permission is granted.
 *
 * Fetches the VAPID public key from the server, subscribes via the
 * PushManager API, and sends the subscription to the server for storage.
 */
export async function subscribeToPush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
    console.warn("[PUSH] Push notifications not supported in this browser");
    return;
  }
  if (Notification.permission !== "granted") return;

  try {
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      console.warn("[PUSH] VAPID public key not available");
      return;
    }

    // Get the active service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Handle existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // One-time VAPID key migration: if we've changed the VAPID key, we need
      // to unsubscribe and create a fresh subscription. This runs once per device.
      const keyMigrated = localStorage.getItem("push-key-migrated");
      if (!keyMigrated) {
        try {
          await existingSubscription.unsubscribe();
          // Small delay for FCM to process the unsubscribe
          await new Promise((r) => setTimeout(r, 500));
          localStorage.setItem("push-key-migrated", "true");
          // Falls through to subscribe() below with fresh keys
        } catch {
          // Unsubscribe failed — re-send the existing one and don't retry
          localStorage.setItem("push-key-migrated", "true");
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              subscription: {
                endpoint: existingSubscription.endpoint,
                keys: existingSubscription.toJSON().keys,
              },
              userAgent: navigator.userAgent,
            }),
          });
          return;
        }
      } else {
        // Already migrated — re-send existing subscription to server
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            subscription: {
              endpoint: existingSubscription.endpoint,
              keys: existingSubscription.toJSON().keys,
            },
            userAgent: navigator.userAgent,
          }),
        });
        return;
      }
    }

    // Subscribe with VAPID authentication
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    // Send subscription to the server
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        subscription: {
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
        },
        userAgent: navigator.userAgent,
      }),
    });

    console.log("[PUSH] ✅ Subscribed to push notifications");
  } catch (err) {
    console.warn("[PUSH] ❌ Subscription failed:", err);
  }
}
