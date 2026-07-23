"use client";

import { useEffect } from "react";

/**
 * Ensures the service worker is registered on every page load.
 * First unregisters any existing service worker to clean up stale
 * registrations (which can cause "Unknown" script errors), then
 * registers the fresh one.
 *
 * On iOS Safari 16.4+, the service worker enables push notifications
 * and offline caching for the installed PWA.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    // Add a version query string so the browser always fetches
    // the latest sw.js after a deploy (CACHE_NAME changed).
    // Bump this number on each deploy to force a SW update.
    const SW_VERSION = "5";
    const swUrl = `/sw.js?v=${SW_VERSION}`;

    async function setupServiceWorker() {
      if (cancelled) return;

      try {
        // First, get all existing registrations for this origin
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (cancelled) return;

        // Check existing registrations.
        // If the active SW is already the latest version, skip re-registering.
        // Otherwise, unregister everything stale and register fresh.
        let isCurrentVersionActive = false;
        for (const reg of registrations) {
          const scriptUrl = reg.active?.scriptURL || "";
          if (scriptUrl.includes(`/sw.js?v=${SW_VERSION}`)) {
            isCurrentVersionActive = true;
          } else {
            // Unregister stale or corrupted registrations
            await reg.unregister().catch(() => {});
          }
        }

        // If current version is already active, skip re-registering
        if (isCurrentVersionActive) return;
        if (cancelled) return;

        // Register the fresh version
        const registration = await navigator.serviceWorker.register(swUrl);
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
      } catch {
        // SW setup failed silently — not critical
      }
    }

    setupServiceWorker();

    return () => {
      cancelled = true;
    };
  }, []);

  // This component renders nothing
  return null;
}
