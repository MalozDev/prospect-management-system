"use client";

import Link from "next/link";

import { PageShell } from "@/components/shared/PageShell";
import { useApiData } from "@/lib/use-api-data";
import type { INotification } from "@/lib/models/Notification";

export default function NotificationsPage() {
  const { data } = useApiData<{ notifications: INotification[] }>("/api/notifications", { notifications: [] });

  const notifications = data.notifications;

  return (
    <PageShell title="Notifications" description="Stay updated with reminders and important updates.">
      <div className="grid gap-4">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <Link
              key={String(item._id)}
              href="/followups"
              className={`block rounded-3xl border p-4 shadow-sm ${item.unread ? "border-[#E60012]/20 bg-[#fff8f8]" : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.message}</p>
                </div>
                <span className="text-sm text-gray-400">{item.time}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No notifications yet.
          </div>
        )}
      </div>
    </PageShell>
  );
}
