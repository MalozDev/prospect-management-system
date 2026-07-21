"use client";

import { useState, useEffect, useRef } from "react";
import { getToken } from "./api-client";

const POLL_INTERVAL_MS = 30_000;

/**
 * Hook that fetches and maintains the unread notification count.
 * Polls every 30 seconds and also listens for a custom
 * "notification-refresh" event for instant updates.
 */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = async () => {
    const token = getToken();
    if (!token) return; // Not logged in

    try {
      const res = await fetch("/api/notifications?unreadOnly=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const notifications = data.notifications || [];
      setCount(notifications.length);
    } catch {
      // Silent fail — will retry on next poll
    }
  };

  useEffect(() => {
    // Fetch immediately on mount
    fetchCount();

    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);

    // Listen for instant refresh events
    const handleRefresh = () => {
      fetchCount();
    };
    window.addEventListener("notification-refresh", handleRefresh);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("notification-refresh", handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return count;
}
