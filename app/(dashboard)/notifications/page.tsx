import { PageShell } from "@/components/shared/PageShell";
import { notifications } from "@/lib/mock-data";

export default function NotificationsPage() {
  return (
    <PageShell title="Notifications" description="Stay updated with reminders and important updates.">
      <div className="grid gap-4">
        {notifications.map((item) => (
          <div key={item.id} className={`rounded-3xl border p-4 shadow-sm ${item.unread ? "border-[#E60012]/20 bg-[#fff8f8]" : "border-gray-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.message}</p>
              </div>
              <span className="text-sm text-gray-400">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
