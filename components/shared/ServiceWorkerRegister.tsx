"use client";

import { useEffect } from "react";

/**
 * Ensures the service worker is registered on every page load.
 * Uses a timestamp query param to bust the browser cache,
 * forcing the new SW to download on every deploy.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    // Add a version query string so the browser always fetches
    // the latest sw.js after a deploy (CACHE_NAME changed).
    // Using a fixed version per deploy avoids re-installing on
    // every page load (which Date.now() would cause).
    // Bump this number on each deploy to force a SW update.
    const SW_VERSION = "2";
    const swUrl = `/sw.js?v=${SW_VERSION}`;

    navigator.serviceWorker
      .register(swUrl)
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
