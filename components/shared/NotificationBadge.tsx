"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/lib/use-unread-count";

interface NotificationBadgeProps {
  /** Where the bell icon links to. Defaults to "/notifications" (DSE). 
   *  Superadmins should pass "/developer/notifications". */
  href?: string;
}

/**
 * Bell icon with a live unread notification count badge.
 * Polls the count every 15 seconds, also updated in real-time via SSE.
 * Place in page headers so it's always visible.
 */
export function NotificationBadge({ href = "/notifications" }: NotificationBadgeProps) {
  const unreadCount = useUnreadCount();

  return (
    <Link
      href={href}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-[#E60012]"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className="absolute z-50 -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E60012] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white shadow-sm animate-scale-in"
          style={{ color: "white" }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
