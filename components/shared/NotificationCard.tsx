"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCheck, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/time-utils";
import type { INotification } from "@/lib/models/Notification";

export type NotificationTheme = "dse" | "supervisor" | "developer";

interface NotificationCardProps {
  notification: INotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  dismissing: boolean;
  /** Visual theme — controls colors and styling */
  theme?: NotificationTheme;
}

/**
 * Reusable notification card component.
 * Supports 3 themes: dse (default), supervisor, developer.
 *
 * - Clicking the card navigates to the notification's URL and marks it read
 * - Hover reveals mark-read and dismiss buttons
 * - Unread notifications get a highlighted style
 */
export function NotificationCard({
  notification,
  onMarkRead,
  onDismiss,
  dismissing,
  theme = "dse",
}: NotificationCardProps) {
  const id = String(notification._id);

  if (theme === "developer") {
    return (
      <div
        className={`group relative flex items-start gap-3 rounded-2xl border p-4 transition ${
          dismissing ? "opacity-50" : ""
        } ${
          notification.unread
            ? "border-purple-500/30 bg-[#1a1a3e]"
            : "border-gray-700/50 bg-[#1a1a3e]/50"
        }`}
      >
        <Link
          href={notification.url || "/developer/dashboard"}
          className="flex-1 min-w-0"
          onClick={() => {
            if (notification.unread) onMarkRead(id);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {notification.unread && (
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                )}
                <h3
                  className={`font-semibold ${
                    notification.unread ? "text-white" : "text-gray-300"
                  }`}
                >
                  {notification.title}
                </h3>
              </div>
              <p
                className={`mt-0.5 text-sm ${
                  notification.unread ? "text-gray-300" : "text-gray-500"
                }`}
              >
                {notification.message}
              </p>
            </div>
            <span className="shrink-0 text-xs text-gray-500">
              {formatRelativeTime(notification.time)}
            </span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          {notification.unread && (
            <button
              type="button"
              onClick={() => onMarkRead(id)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 opacity-0 transition hover:bg-[#252550] hover:text-purple-400 group-hover:opacity-100"
              title="Mark as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(id)}
            disabled={dismissing}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 opacity-0 transition hover:bg-[#252550] hover:text-red-400 group-hover:opacity-100 disabled:opacity-30"
            title="Dismiss"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // DSE & Supervisor themes (same visual style — both show the unread dot)
  return (
    <div
      className={`group relative flex items-start gap-3 rounded-3xl border p-4 shadow-sm transition ${
        dismissing ? "opacity-50" : ""
      } ${
        notification.unread
          ? "border-[#E60012]/20 bg-[#fff8f8]"
          : "border-gray-200 bg-white"
      }`}
    >
      <Link
        href={notification.url || (theme === "supervisor" ? "/supervisor/dashboard" : "/followups")}
        className="flex-1 min-w-0"
        onClick={() => {
          if (notification.unread) onMarkRead(id);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {notification.unread && (
                <span className="h-2 w-2 rounded-full bg-[#E60012] animate-pulse" />
              )}
              <h3 className="font-semibold text-gray-900">{notification.title}</h3>
            </div>
            <p className="mt-0.5 text-sm text-gray-600">{notification.message}</p>
          </div>
          <span className="shrink-0 text-xs text-gray-400">
            {formatRelativeTime(notification.time)}
          </span>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        {notification.unread && (
          <button
            type="button"
            onClick={() => onMarkRead(id)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
            title="Mark as read"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          disabled={dismissing}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-30"
          title="Dismiss"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
