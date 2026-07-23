"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import type { INotification } from "@/lib/models/Notification";
import { Bell, CheckCheck, Trash2, BellRing } from "lucide-react";
import { formatRelativeTime } from "@/lib/time-utils";

export default function DeveloperNotificationsPage() {
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

      {unreadCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-purple-300">{unreadCount}</span> unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-gray-700 bg-[#252550] px-3 py-2 text-xs font-medium text-gray-300 transition hover:bg-[#2f2f60]"
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
                className={`group relative flex items-start gap-3 rounded-2xl border p-4 transition ${
                  dismissing.has(id) ? "opacity-50" : ""
                } ${
                  item.unread
                    ? "border-purple-500/30 bg-[#1a1a3e]"
                    : "border-gray-700/50 bg-[#1a1a3e]/50"
                }`}
              >
                <Link
                  href={item.url || "/developer/dashboard"}
                  className="flex-1 min-w-0"
                  onClick={() => { if (item.unread) handleMarkRead(id); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.unread && (
                          <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                        )}
                        <h3 className={`font-semibold ${item.unread ? "text-white" : "text-gray-300"}`}>
                          {item.title}
                        </h3>
                      </div>
                      <p className={`mt-0.5 text-sm ${item.unread ? "text-gray-300" : "text-gray-500"}`}>
                        {item.message}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{formatRelativeTime(item.time)}</span>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-1">
                  {item.unread && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 opacity-0 transition hover:bg-[#252550] hover:text-purple-400 group-hover:opacity-100"
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismiss(id)}
                    disabled={dismissing.has(id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 opacity-0 transition hover:bg-[#252550] hover:text-red-400 group-hover:opacity-100 disabled:opacity-30"
                    title="Dismiss"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
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
