"use client";

import { useState } from "react";
import Link from "next/link";

import { PageShell } from "@/components/shared/PageShell";
import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import type { INotification } from "@/lib/models/Notification";
import { CheckCheck, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/time-utils";

export default function NotificationsPage() {
  const { data, refetch } = useApiData<{ notifications: INotification[] }>("/api/notifications", { notifications: [] });
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  const notifications = data.notifications;
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "PATCH" });
      refetch();
    } catch {
      // Silently fail
    }
  };

  const handleDismiss = async (id: string) => {
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      refetch();
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
  };

  return (
    <PageShell title="Notifications" description="Stay updated with reminders and important updates.">
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
          notifications.map((item) => {
            const id = String(item._id);
            return (
              <div
                key={id}
                className={`group relative flex items-start gap-3 rounded-3xl border p-4 shadow-sm transition ${
                  dismissing.has(id) ? "opacity-50" : ""
                } ${
                  item.unread
                    ? "border-[#E60012]/20 bg-[#fff8f8]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Link
                  href="/followups"
                  className="flex-1 min-w-0"
                  onClick={() => { if (item.unread) handleMarkRead(id); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="mt-0.5 text-sm text-gray-600">{item.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(item.time)}</span>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-1">
                  {item.unread && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(id); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDismiss(id); }}
                    disabled={dismissing.has(id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-30"
                    title="Dismiss"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <CheckCheck className="h-6 w-6 text-gray-300" />
            </div>
            No notifications yet.
          </div>
        )}
      </div>
    </PageShell>
  );
}
