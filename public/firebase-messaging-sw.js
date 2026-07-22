// 🔥 Firebase Messaging Service Worker
// Required by the Firebase Web SDK for receiving push notifications
// This file MUST be at /firebase-messaging-sw.js in the public directory

importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

// Initialize Firebase (must match the config in lib/firebase-client.ts)
firebase.initializeApp({
  apiKey: "AIzaSyDW3DBL9lAV5u73xbMawzG44AfjPTbecBw",
  authDomain: "prospects-ced45.firebaseapp.com",
  projectId: "prospects-ced45",
  storageBucket: "prospects-ced45.firebasestorage.app",
  messagingSenderId: "464728831909",
  appId: "1:464728831909:web:958499fdfb0ef978a6da4c",
});

const messaging = firebase.messaging();

// Handle background push notifications when the app is closed
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw] Background message:", payload);

  const notificationTitle = payload.notification?.title || "Prospects";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new notification.",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    vibrate: [300, 100, 200, 100, 300],
    requireInteraction: true,
    data: {
      url: payload.fcmOptions?.link || "/",
      click_action: payload.fcmOptions?.link || "/",
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app and navigate to the URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";
  const absoluteUrl = urlToOpen.startsWith("/")
    ? self.location.origin + urlToOpen
    : urlToOpen;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(absoluteUrl);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }
      })
  );
});
