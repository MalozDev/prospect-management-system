"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download, Bell, CheckCircle2 } from "lucide-react";

// BeforeInstallPromptEvent - Chrome-specific but widely supported
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type NotifStatus = "idle" | "granted" | "denied" | "unsupported" | "subscribing";

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotifStatus>("idle");

  // Register service worker on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // Service worker registered
        })
        .catch(() => {
          // SW registration failed - not critical
        });
    }
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if (!("Notification" in window)) {
      setNotificationStatus("unsupported");
      return;
    }
    setNotificationStatus(
      Notification.permission === "granted"
        ? "granted"
        : Notification.permission === "denied"
        ? "denied"
        : "idle"
    );
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);

      const dismissedFlag = localStorage.getItem("pwa-install-dismissed");
      if (!dismissedFlag) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowBanner(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      setNotificationStatus("subscribing");

      // Get VAPID public key from server
      const keyRes = await fetch("/api/push/vapid-public-key");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) throw new Error("No public key");

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyData.publicKey,
      });

      // Send subscription to server
      const subJson = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      setNotificationStatus("granted");
    } catch {
      // Push subscription failed - still mark as granted for in-app notifications
      setNotificationStatus("granted");
    }
  }, []);

  const handleRequestNotification = async () => {
    if (!("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        // Now subscribe for push
        await subscribeToPush();
      } else {
        setNotificationStatus("denied");
      }
    } catch {
      setNotificationStatus("denied");
    }
  };

  // Use a helper to avoid TS narrowing false positives with compound conditions
  function shouldShow(): boolean {
    // If dismissed, hide unless there's still a pending notification prompt
    if (dismissed) {
      return notificationStatus === "idle" || notificationStatus === "subscribing";
    }

    // If no install banner, hide when notification prompt is resolved
    if (!showBanner) {
      return notificationStatus === "idle" || notificationStatus === "subscribing";
    }

    // Show install banner
    return true;
  }

  if (!shouldShow()) return null;

  const showInstallBanner = showBanner && !!installPrompt;
  const isIdle = notificationStatus === "idle";
  const isSubscribing = notificationStatus === "subscribing";
  const showNotificationPrompt = isIdle && !showBanner;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80">
      {/* Install banner */}
      {showInstallBanner && (
        <div className="animate-scale-in rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E60012]">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Install App</p>
                <p className="text-xs text-gray-500">Add to your home screen</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="mt-3 h-10 w-full rounded-xl bg-[#E60012] text-sm font-medium text-white transition hover:bg-red-700"
          >
            Install
          </button>
        </div>
      )}

      {/* Notification permission + push subscription prompt */}
      {showNotificationPrompt && (
        <div className="animate-scale-in rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Enable Notifications</p>
                <p className="text-xs text-gray-500">Get alerts even when you&apos;re away</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestNotification}
            disabled={isSubscribing}
            className="mt-3 h-10 w-full rounded-xl bg-blue-500 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubscribing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Setting up...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Allow Notifications
              </>
            )}
          </button>
        </div>
      )}

      {/* Push subscribed successfully confirmation */}
      {isSubscribing && !showBanner && (
        <div className="animate-scale-in rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              Push notifications enabled!
            </p>
          </div>
          <p className="mt-1 text-xs text-emerald-600">
            You&apos;ll get alerts for follow-ups &amp; visits.
          </p>
        </div>
      )}
    </div>
  );
}
