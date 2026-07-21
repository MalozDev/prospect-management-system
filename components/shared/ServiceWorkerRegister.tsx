"use client";

import { useEffect } from "react";

/**
 * Ensures the service worker is registered on every page load.
 * This is critical for push notifications to work reliably,
 * especially after a fresh PWA launch or page refresh.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;

        // Listen for updates — catch errors from update() separately
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("New version available. Refresh to update.");
              }
            });
          }
        });
      })
      .catch(() => {
        // SW registration failed silently — not critical
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // This component renders nothing
  return null;
}
