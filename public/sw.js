// 🔄 Increment this version whenever you deploy service worker changes.
// The browser detects the change and activates the new SW immediately.
// Using timestamp ensures every deploy gets a fresh cache.
const CACHE_NAME = "prospects-" + new Date().toISOString().slice(0, 10);

const STATIC_ASSETS = [
  "/",
  "/login",
  "/register",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
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

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // For API requests - network only (no cache)
  if (event.request.url.includes("/api/")) {
    return;
  }

  // For navigation requests - serve index.html from cache if offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/");
      })
    );
    return;
  }

  // For static assets - cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          // Cache successful responses
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

// Push notification event
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Prospects";
    const options = {
      body: data.message || "You have a new notification.",
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      vibrate: [200, 100, 200],
      tag: data.tag || "default",
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(
      (async () => {
        // Show the notification
        await self.registration.showNotification(title, options);

        // Set app badge on the home screen icon (Android Chrome)
        // Uses the Badge API via ServiceWorkerRegistration —
        // supported on Chrome/Edge/Opera on Android
        if (typeof data.unreadCount === "number" && self.registration.setAppBadge) {
          try {
            await self.registration.setAppBadge(data.unreadCount);
          } catch {
            // Badge API not supported — silently fail
          }
        }
      })()
    );
  } catch {
    // If parsing fails, show raw text
    event.waitUntil(
      self.registration.showNotification("Prospects", {
        body: event.data.text(),
        icon: "/icons/icon-192.svg",
      })
    );
  }
});

// Listen for messages from the app to clear the badge
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_BADGE") {
    if (self.registration.clearAppBadge) {
      self.registration.clearAppBadge().catch(() => {});
    }
  }
});

// Notification click event - open the app and navigate
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

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
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
