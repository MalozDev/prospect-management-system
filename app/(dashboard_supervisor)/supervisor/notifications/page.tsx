"use client";

import { useState } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { NotificationCard, type NotificationTheme } from "@/components/shared/NotificationCard";
import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import type { INotification } from "@/lib/models/Notification";
import { Bell, CheckCheck } from "lucide-react";

export default function SupervisorNotificationsPage() {
  const { data, refetch } = useApiData<{ notifications: INotification[] }>("/api/notifications", { notifications: [] });
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  const notifications = data.notifications;
  const unreadCount = notifications.filter((n) => n.unread).length;

  const triggerRefresh = () => {
    window.dispatchEvent(new Event("notification-refresh"));
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "PATCH" });
      refetch();
      triggerRefresh();
    } catch {
      // Silently fail
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
      try {
        await apiFetch(`/api/notifications/${String(n._id)}`, { method: "PATCH" });
      } catch {
        // Continue
      }
    }
    refetch();
    triggerRefresh();
  };

  const theme: NotificationTheme = "supervisor";

  return (
    <PageShell title="Notifications" description="Stay updated on your team's activity and prospect updates.">
      {unreadCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{unreadCount}</span> unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
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
              theme={theme}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <Bell className="h-6 w-6 text-gray-300" />
            </div>
            <p className="font-medium">No notifications yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Team activity and prospect updates will appear here.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
