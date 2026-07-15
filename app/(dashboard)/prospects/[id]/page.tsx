import Link from "next/link";
import { ArrowLeft, PhoneCall, MessageCircle } from "lucide-react";

import { PageShell } from "@/components/shared/PageShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { activities, prospects as mockProspects, type Prospect } from "@/lib/mock-data";

interface ProspectPageProps {
  params: { id: string };
}

function getStoredProspects(): Prospect[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mockProspects");
    return raw ? (JSON.parse(raw) as Prospect[]) : [];
  } catch {
    return [];
  }
}

export default function ProspectDetailPage({ params }: ProspectPageProps) {
  const allProspects = [...mockProspects, ...(typeof window !== "undefined" ? getStoredProspects() : [])];
  const prospect = allProspects.find((item) => item.id === params.id) ?? mockProspects[0];

  const prospectActivities = activities.filter((activity) => activity.detail.includes(prospect.name));

  return (
    <PageShell title="Prospect details" description="Contact this prospect and track every step.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <Link href="/prospects" className="inline-flex items-center gap-2 text-sm font-medium text-[#E60012]">
            <ArrowLeft className="h-4 w-4" /> Back to prospects
          </Link>
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-3xl bg-[#fff8f8] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{prospect.name}</h1>
                  <p className="text-sm text-gray-500">{prospect.location}</p>
                </div>
                <StatusBadge status={prospect.status} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{prospect.phone}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-500">Follow-up date</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{prospect.expectedPurchaseDate}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Address</p>
                <p className="mt-2 text-gray-900">{prospect.address}</p>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="mt-2 text-gray-900">{prospect.notes}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E60012] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#c0000f]">
                <PhoneCall className="h-4 w-4" /> Call
              </button>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
          <p className="mt-1 text-sm text-gray-500">Recent actions for this prospect.</p>
          <div className="mt-6">
            <ActivityTimeline activities={prospectActivities.length ? prospectActivities : activities.slice(0, 3)} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
