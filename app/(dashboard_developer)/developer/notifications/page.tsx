"use client";

import { useState } from "react";
import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import { NotificationCard } from "@/components/shared/NotificationCard";
import type { INotification } from "@/lib/models/Notification";
import { Bell, CheckCheck, BellRing, Trash2 } from "lucide-react";

export default function DeveloperNotificationsPage() {
  const { data, refetch } = useApiData<{ notifications: INotification[] }>("/api/notifications", { notifications: [] });
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());

  const notifications = data.notifications;
  const unreadCount = notifications.filter((n) => n.unread).length;

  const triggerRefresh = () => {
    window.dispatchEvent(new Event("notification-refresh"));
  };

  const handleMarkRead = async (id: string) => {
    setMarkingRead((prev) => new Set(prev).add(id));
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "PATCH" });
      refetch();
      triggerRefresh();
    } catch {
      // Silently fail
    } finally {
      setMarkingRead((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDismiss = async (id: string) => {
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      refetch();
      triggerRefresh();
    } catch {
      // Silently fail
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => n.unread);
    for (const n of unread) {
      setMarkingRead((prev) => new Set(prev).add(String(n._id)));
      try {
        await apiFetch(`/api/notifications/${String(n._id)}`, { method: "PATCH" });
      } catch {
        // Continue
      } finally {
        setMarkingRead((prev) => {
          const next = new Set(prev);
          next.delete(String(n._id));
          return next;
        });
      }
    }
    refetch();
    triggerRefresh();
  };

  const handleClearAll = async () => {
    try {
      await apiFetch("/api/notifications/clear", { method: "DELETE" });
      refetch();
      triggerRefresh();
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="h-5 w-5 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            <p className="mt-1 text-sm text-gray-400">
              System-wide alerts and updates.
            </p>
          </div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-purple-300">{unreadCount}</span> unread · {notifications.length} total
          </p>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 rounded-xl border border-gray-700 bg-[#252550] px-3 py-2 text-xs font-medium text-gray-300 transition hover:bg-[#2f2f60]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-xl border border-red-800/30 bg-red-900/20 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-900/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <NotificationCard
              key={String(item._id)}
              notification={item}
              onMarkRead={handleMarkRead}
              onDismiss={handleDismiss}
              dismissing={dismissing.has(String(item._id))}
              markingRead={markingRead.has(String(item._id))}
              theme="developer"
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700/50 bg-[#1a1a3e] p-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#252550]">
              <Bell className="h-7 w-7 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">No notifications yet.</p>
            <p className="mt-1 text-xs text-gray-600">Notifications will appear here when events occur in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
