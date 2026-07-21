"use client";

import { useState, useEffect, useRef } from "react";
import { getToken } from "./api-client";

const POLL_INTERVAL_MS = 15_000;
const CACHE_KEY = "crm-unread-count";

/**
 * Read the cached unread count from localStorage for instant display.
 */
function getCachedCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : 0;
  } catch {
    return 0;
  }
}

/**
 * Write the unread count to localStorage cache.
 */
function setCachedCount(count: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(count));
  } catch {
    // Storage full — silently ignore
  }
}

/**
 * Post the current unread count to the service worker so it can update
 * the home-screen app badge (the little number on the app icon).
 */
function postBadgeToSw(count: number): void {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "SET_BADGE",
    count,
  });
}

/**
 * Hook that maintains the live unread notification count
 * AND keeps the PWA home-screen app badge in sync.
 *
 * Strategy (3 layers for maximum responsiveness):
 * 1. **localStorage cache** — instant display on page load (no network wait)
 * 2. **SSE (Server-Sent Events)** — real-time updates when connected
 * 3. **Polling fallback** — every 15s if SSE disconnects
 */
export function useUnreadCount(): number {
  // Start with cached value for instant display
  const [count, setCount] = useState(getCachedCount);
  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync the PWA home-screen app badge whenever count changes
  useEffect(() => {
    postBadgeToSw(count);
  }, [count]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCount(0);
      setCachedCount(0);
      return;
    }

    let cancelled = false;

    // ── Layer 1: Refresh cache on mount via fetch ──
    async function fetchInitial() {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const notifications = data.notifications || [];
        if (!cancelled) {
          setCount(notifications.length);
          setCachedCount(notifications.length);
        }
      } catch {
        // Silent fail — cached value is already displayed
      }
    }
    fetchInitial();

    // ── Layer 2: SSE for real-time updates ──
    function connectSse() {
      if (cancelled) return;
      // Close any existing connection
      if (sseRef.current) {
        sseRef.current.close();
      }

      // EventSource can't set custom headers, so pass token as query param
      // token is guaranteed to be non-null here (checked above)
      const eventSource = new EventSource(`/api/notifications/events?token=${encodeURIComponent(token!)}&t=${Date.now()}`);

      // Listen for unread count updates
      eventSource.addEventListener("init", (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);
          if (typeof data.unreadCount === "number") {
            setCount(data.unreadCount);
            setCachedCount(data.unreadCount);
          }
        } catch {
          // Ignore malformed events
        }
      });

      eventSource.addEventListener("notification", (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);
          if (typeof data.unreadCount === "number") {
            setCount(data.unreadCount);
            setCachedCount(data.unreadCount);
          }
        } catch {
          // Ignore malformed events
        }
      });

      eventSource.addEventListener("refresh", (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);
          if (typeof data.unreadCount === "number") {
            setCount(data.unreadCount);
            setCachedCount(data.unreadCount);
          }
        } catch {
          // Ignore malformed events
        }
      });

      // On error, SSE will auto-reconnect — but we also have polling as fallback
      eventSource.onerror = () => {
        // EventSource will attempt to reconnect automatically
      };

      sseRef.current = eventSource;
    }

    connectSse();

    // ── Layer 3: Polling fallback (runs even if SSE is connected) ──
    pollRef.current = setInterval(async () => {
      const currentToken = getToken();
      if (!currentToken) return;
      try {
        const res = await fetch("/api/notifications?unreadOnly=true", {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const notifications = data.notifications || [];
        if (!cancelled) {
          setCount(notifications.length);
          setCachedCount(notifications.length);
        }
      } catch {
        // Silent fail
      }
    }, POLL_INTERVAL_MS);

    // ── Also listen for manual refresh events (from notifications page) ──
    const handleRefresh = () => {
      // Trigger a fetch immediately
      const currentToken = getToken();
      if (!currentToken) return;
      fetch("/api/notifications?unreadOnly=true", {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data && !cancelled) {
            const notifications = data.notifications || [];
            setCount(notifications.length);
            setCachedCount(notifications.length);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("notification-refresh", handleRefresh);

    return () => {
      cancelled = true;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      window.removeEventListener("notification-refresh", handleRefresh);
    };
  }, []);

  return count;
}
