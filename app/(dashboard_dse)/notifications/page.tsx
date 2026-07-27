"use client";

import { useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { NotificationCard } from "@/components/shared/NotificationCard";
import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import type { INotification } from "@/lib/models/Notification";
import { CheckCheck, Bell, Trash2 } from "lucide-react";

export default function NotificationsPage() {
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
    <PageShell title="Notifications" description="Stay updated with reminders and important updates.">
      {notifications.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{unreadCount}</span> unread · {notifications.length} total
          </p>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
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
              theme="dse"
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <Bell className="h-6 w-6 text-gray-300" />
            </div>
            No notifications yet.
          </div>
        )}
      </div>
    </PageShell>
  );
}
