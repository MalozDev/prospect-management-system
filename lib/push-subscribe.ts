/**
 * Register the browser for push notifications via Firebase Cloud Messaging.
 *
 * Uses Firebase Messaging's `getToken()` to obtain an FCM registration token,
 * then sends it to the server for storage.
 *
 * This is the only subscription method — the old `pushManager.subscribe()`
 * Web Push fallback has been removed. All browsers on Android use FCM
 * as their push service, and Firebase handles the VAPID key internally.
 */

import { getToken } from "./api-client";
import { getFcmToken } from "./firebase-client";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Get an FCM registration token and send it to the server.
 * Must be called after notification permission is granted.
 */
export async function subscribeToPush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const fcmToken = await getFcmToken();
    if (!fcmToken) {
      console.warn("[PUSH] Firebase Messaging not available on this browser");
      return;
    }

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fcmToken,
        userAgent: navigator.userAgent,
      }),
    });
  } catch {
    // Best-effort
  }
}
