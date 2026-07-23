"use client";

import { useEffect, useRef } from "react";
import { getToken } from "@/lib/api-client";
import { subscribeToPush } from "@/lib/push-subscribe";

/**
 * Auto-subscribes the browser to push notifications on EVERY page load,
 * not just after login. This is critical because:
 *
 * 1. The user may open the installed PWA from the home screen
 *    (not via login flow), so subscribeToPush() won't be called.
 *
 * 2. The push subscription may have expired or been deleted
 *    on the server — re-sending it keeps it alive.
 *
 * 3. Works alongside the login/register call — both run,
 *    it's idempotent.
 *
 * Place this in the root layout so it runs on every page.
 */
export function PushAutoSubscribe() {
  const ranRef = useRef(false);

  useEffect(() => {
    // Only run once per page load, even in StrictMode
    if (ranRef.current) return;
    ranRef.current = true;

    // Only run if the user is logged in (token exists)
    const token = getToken();
    if (!token) return;

    // Check browser support
    const pushSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!pushSupported) {
      console.warn(
        "[PUSH] Push notifications not supported in this browser. " +
        "Requires: serviceWorker, PushManager, and Notification APIs."
      );
      return;
    }

    // ── Secure context check ──
    // Push notifications require either HTTPS or localhost.
    const isSecureContext =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isSecureContext) {
      console.warn(
        "📵 Push notifications require HTTPS or localhost. " +
        "Testing via HTTP (e.g. http://192.168.x.x) will NOT trigger push notifications.\n" +
        "  → Run: ngrok http 3000\n" +
        "  → Then open the HTTPS ngrok URL on your phone to test."
      );
    }

    // ── Permission handling ──
    if (Notification.permission === "granted") {
      // Already allowed — subscribe/refresh the subscription
      subscribeToPush().catch((err) => {
        console.warn("📵 Push subscription/renewal failed:", err);
      });
    } else if (Notification.permission === "default") {
      // Never asked before — request permission now
      Notification.requestPermission()
        .then((permission) => {
          if (permission === "granted") {
            subscribeToPush().catch((err) => {
              console.warn("📵 Push subscription after permission grant failed:", err);
            });
          } else if (permission === "denied") {
            console.warn("📵 Notification permission denied. Enable it in your browser settings.");
          }
        })
        .catch((err) => {
          console.warn("📵 Notification permission request failed:", err);
        });
    }
    // If "denied", the user must enable in browser settings — we can't ask again

    // Clear the app badge when the user opens the app
    // This tells the OS that the user has seen their notifications
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_BADGE" });
    }
  }, []);

  return null;
}
