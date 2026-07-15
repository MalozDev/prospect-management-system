import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, UserCircle2 } from "lucide-react";

export default function ProfilePage() {
  return (
    <PageShell title="Profile" description="Your account and workspace details.">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f1] text-[#E60012]">
            <UserCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Nalu Mwansa</h2>
            <p className="text-sm text-gray-500">DSE • Supervisor: Tebo</p>
            <p className="text-sm text-gray-500">CUG: 2001</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#fafafa] p-4">
            <p className="text-sm text-gray-500">Role</p>
            <p className="mt-1 font-semibold text-gray-900">Direct Sales Executive</p>
          </div>
          <div className="rounded-2xl bg-[#fafafa] p-4">
            <p className="text-sm text-gray-500">Region</p>
            <p className="mt-1 font-semibold text-gray-900">Lusaka</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" /> Settings
          </Button>
          <Button variant="destructive" className="gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
