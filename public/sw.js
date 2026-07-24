// 🔄 Increment this version whenever you deploy service worker changes.
// The browser detects the change and activates the new SW immediately.
// Increment on each deploy to force a fresh SW install.
// Current: 2026-07-23 (v6)
const CACHE_NAME = "prospects-v6-" + new Date().toISOString().slice(0, 10);

const STATIC_ASSETS = [
  "/",
  "/login",
  "/register",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// ── Install event ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate event — clean old caches ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch event — network first, fallback to cache ──
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
      );
    })
  );
});

// ── Push notification event ──
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Prospects";

    // Build notification options with maximum compatibility
    //
    // ── ICONS ──
    //   icon:     Large notification image (PNG required; SVG shows as blank on Android)
    //   badge:    Small status-bar icon — Android renders the alpha channel as a
    //             monochrome silhouette in the system accent color. A red-on-white
    //             PNG will show as the alpha silhouette of the white background.
    //             For best results, use a white shape on transparent background.
    //
    // ── VIBRATION ──
    //   Android:  Uses the vibrate[] pattern below.
    //   iOS:      Does NOT support the Vibration API in service workers or web pages.
    //             This is a platform limitation — iOS web notifications never vibrate.
    //
    const options = {
      body: data.message || "You have a new notification.",
      icon: "/icons/notif-icon-192.png",
      badge: "/icons/badge-96.png",
      // Strong vibration pattern for Android: ½s vibrate × 3 with short pauses
      vibrate: [1000, 500, 1000, 500, 1000],
      tag: data.tag || "default",
      // Keep the notification visible until the user interacts with it
      requireInteraction: true,
      // Explicitly allow sound (not silent)
      silent: false,
      // Renotify so repeated notifications with the same tag still alert
      renotify: true,
      data: {
        url: data.url || "/",
        timestamp: Date.now(),
      },
    };

    event.waitUntil(
      (async () => {
        // Show the notification
        await self.registration.showNotification(title, options);

        // Update app badge on the home screen icon (Android Chrome, iOS)
        // Uses the Badge API via ServiceWorkerRegistration
        if (typeof data.unreadCount === "number") {
          try {
            if (data.unreadCount > 0) {
              await self.registration.setAppBadge(data.unreadCount);
            } else {
              await self.registration.clearAppBadge();
            }
          } catch {
            // Badge API not supported — silently fail
          }
        }
      })()
    );
  } catch (e) {
    // If JSON parsing fails, show raw text notification
    console.error("SW push parse error:", e);
    event.waitUntil(
      self.registration.showNotification("Prospects", {
        body: event.data.text(),
        icon: "/icons/notif-icon-192.png",
        badge: "/icons/badge-96.png",
        vibrate: [1000, 500, 1000, 500, 1000],
        requireInteraction: true,
        silent: false,
      })
    );
  }
});

// ── Message listener — receives commands from the app ──
self.addEventListener("message", (event) => {
  if (!event.data || !event.data.type) return;

  switch (event.data.type) {
    case "CLEAR_BADGE":
      // Clear the app badge when user opens the app
      if (self.registration.clearAppBadge) {
        self.registration.clearAppBadge().catch(() => {});
      }
      break;

    case "SET_BADGE":
      // Update the app badge with a specific unread count
      if (typeof event.data.count === "number") {
        if (self.registration.setAppBadge) {
          try {
            if (event.data.count > 0) {
              self.registration.setAppBadge(event.data.count);
            } else {
              self.registration.clearAppBadge();
            }
          } catch {
            // Badge API not supported
          }
        }
      }
      break;
  }
});

// ── Notification click event ──
// Opens the app and navigates to the notification's target URL.
// Works on all platforms: Android, iOS, Desktop.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  // Clear the badge when user clicks a notification
  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge().catch(() => {});
  }

  // Ensure urlToOpen is an absolute URL (required by openWindow on some browsers)
  const absoluteUrl = urlToOpen.startsWith("/")
    ? self.location.origin + urlToOpen
    : urlToOpen;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // If already open, focus and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(absoluteUrl);
            }
            return;
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }
      })
  );
});
