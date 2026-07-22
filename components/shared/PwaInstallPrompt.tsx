"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download, Bell, CheckCircle2 } from "lucide-react";
import { subscribeToPush } from "@/lib/push-subscribe";

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
      setDismissed(true);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Handle notification permission request and push subscription via Firebase
  const handleRequestNotification = useCallback(async () => {
    if (!("Notification" in window)) return;

    try {
      setNotificationStatus("subscribing");
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        // Use the shared Firebase-based subscribeToPush
        await subscribeToPush();
        setNotificationStatus("granted");
      } else {
        setNotificationStatus("denied");
      }
    } catch {
      setNotificationStatus("denied");
    }
  }, []);

  // Auto-hide the success confirmation after 4 seconds
  useEffect(() => {
    if (notificationStatus === "granted") {
      const timer = setTimeout(() => setDismissed(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [notificationStatus]);

  // Show the card for: idle (need prompt), subscribing (in progress), granted (success)
  function shouldShow(): boolean {
    if (dismissed) return false;
    if (!showBanner) {
      return notificationStatus === "idle" ||
             notificationStatus === "subscribing" ||
             notificationStatus === "granted";
    }
    return true;
  }

  if (!shouldShow()) return null;

  const showInstallBanner = showBanner && !!installPrompt;
  const isIdle = notificationStatus === "idle";
  const isSubscribing = notificationStatus === "subscribing";
  const showNotificationPrompt = isIdle && !showBanner;
  const showSuccess = notificationStatus === "granted" && !showBanner;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:top-6 md:left-auto md:right-6 md:w-80">
      {/* Install banner */}
      {showInstallBanner && (
        <div className="animate-slide-down rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
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
              aria-label="Dismiss"
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
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600"
          >
            Not now
          </button>
        </div>
      )}

      {/* Notification permission + push subscription prompt */}
      {showNotificationPrompt && (
        <div className="animate-slide-down rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
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
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
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
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Push subscribed successfully confirmation */}
      {showSuccess && !showInstallBanner && (
        <div className="animate-slide-down rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">
              Notifications enabled
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
