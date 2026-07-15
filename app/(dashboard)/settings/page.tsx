import { PageShell } from "@/components/shared/PageShell";

export default function SettingsPage() {
  return (
    <PageShell title="Settings" description="Manage app preferences and account details.">
      <div className="grid gap-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Theme</h3>
          <p className="mt-1 text-sm text-gray-500">Light theme is currently enabled.</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <p className="mt-1 text-sm text-gray-500">Enabled for follow-ups, visits, and sales updates.</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">About App</h3>
          <p className="mt-1 text-sm text-gray-500">Airtel Prospect Manager v1.0.0</p>
        </div>
      </div>
    </PageShell>
  );
}
