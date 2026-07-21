"use client";

import { useEffect } from "react";

/**
 * Ensures the service worker is registered on every page load.
 * First unregisters any existing service worker to clean up stale
 * registrations (which can cause "Unknown" script errors), then
 * registers the fresh one.
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
    const SW_VERSION = "3";
    const swUrl = `/sw.js?v=${SW_VERSION}`;

    async function setupServiceWorker() {
      if (cancelled) return;

      try {
        // First, get all existing registrations for this origin
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (cancelled) return;

        // Unregister any stale registrations that don't match our SW URL.
        // This cleans up corrupted or extension-injected SWs while
        // leaving a healthy existing registration intact.
        let hasValidRegistration = false;
        for (const reg of registrations) {
          const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || "";
          if (scriptUrl.includes("/sw.js")) {
            hasValidRegistration = true;
          } else {
            await reg.unregister();
          }
        }

        // If a valid registration already exists, skip re-registering
        if (hasValidRegistration) return;
        if (cancelled) return;

        // Now register the fresh one
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
