"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/lib/use-unread-count";

/**
 * Bell icon with a live unread notification count badge.
 * Polls every 30 seconds. Visible on all pages via the PageShell header.
 * Clicking opens the notifications page.
 */
export function NotificationBadge() {
  const unreadCount = useUnreadCount();

  return (
    <Link
      href="/notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-[#E60012]"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E60012] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white animate-scale-in">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
