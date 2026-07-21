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
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }

    // ── Permission handling ──
    if (Notification.permission === "granted") {
      // Already allowed — subscribe/refresh the subscription
      subscribeToPush().catch(() => {});
    } else if (Notification.permission === "default") {
      // Never asked before — request permission now
      // This ensures the user gets asked even if the PwaInstallPrompt
      // was dismissed on a previous session.
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          subscribeToPush().catch(() => {});
        }
      }).catch(() => {});
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
