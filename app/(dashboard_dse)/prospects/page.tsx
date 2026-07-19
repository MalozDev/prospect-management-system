"use client";

import Link from "next/link";
import { CalendarDays, ChartNoAxesCombined, Users, Sparkles, Phone, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

import { PageShell } from "@/components/shared/PageShell";
import { ProspectCard } from "@/components/shared/ProspectCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { useApiData } from "@/lib/use-api-data";
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import { getStoredProfile } from "@/utils/profile";
import type { IProspect } from "@/lib/models/Prospect";
import type { IActivity } from "@/lib/models/Activity";

export default function ProspectsPage() {
  const { data } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const { data: activitiesData } = useApiData<{ activities: IActivity[] }>("/api/activities?limit=10", { activities: [] });
  const [showList, setShowList] = useState(false);
  const dseName = useMemo(() => getStoredProfile().name, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);
  const weekStart = useMemo(() => {
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    return ws.toISOString().slice(0, 10);
  }, []);

  const prospects = data.prospects;

  // Stats - all prospects (including sold/lost)
  const createdToday = useMemo(
    () => prospects.filter((prospect) => prospect.createdAt === today).length,
    [prospects, today]
  );
  const createdThisWeek = useMemo(
    () =>
      prospects.filter(
        (prospect) => prospect.createdAt && prospect.createdAt >= weekStart && prospect.createdAt <= today
      ).length,
    [prospects, weekStart, today]
  );
  const createdThisMonth = useMemo(
    () =>
      prospects.filter((prospect) => prospect.createdAt && prospect.createdAt.slice(0, 7) === currentMonth).length,
    [prospects, currentMonth]
  );
  const totalProspects = prospects.length;

  // Prospects created today (all statuses)
  const todaysAllProspects = useMemo(
    () => prospects.filter((prospect) => prospect.createdAt === today).slice(0, 6),
    [prospects, today]
  );

  // Count by status for today
  const soldTodayCount = useMemo(
    () => prospects.filter((p) => p.createdAt === today && p.status === "SOLD").length,
    [prospects, today]
  );
  const activeTodayCount = useMemo(
    () => prospects.filter((p) => p.createdAt === today && p.status !== "SOLD" && p.status !== "LOST").length,
    [prospects, today]
  );

  return (
    <PageShell title="Prospects" description="Track the customers you are engaging across the field.">
      {/* ── Stats Row ── */}
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-[#E60012]">
              <CalendarDays className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">Today</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{createdToday}</p>
            <p className="mt-0.5 flex gap-2 text-[9px] text-gray-500">
              <span className="text-emerald-600">{soldTodayCount} sold</span>
              · <span>{activeTodayCount} active</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-[#E60012]">
              <ChartNoAxesCombined className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">Week</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{createdThisWeek}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-[#E60012]">
              <Sparkles className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">Month</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{createdThisMonth}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-[#E60012]">
              <Users className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">All</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalProspects}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Prospects overview</p>
            <p className="text-xs text-gray-500">Create new leads and track your field activity at a glance.</p>
          </div>
          <Link href="/prospects/new" className="inline-flex items-center justify-center rounded-full bg-[#E60012] px-4 py-2 text-sm font-medium text-white">
            + New Prospect
          </Link>
        </div>
      </div>

      {/* ── Today's Activity ── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Today&apos;s activity</p>
            <p className="text-xs text-gray-500">All prospects captured today with their current status.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowList((value) => !value)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#E60012] hover:text-[#E60012]"
          >
            {showList ? "Hide all" : "View all"}
          </button>
        </div>

        {/* Activity feed with timestamps */}
        {activitiesData.activities.length > 0 && (
          <div className="mb-4">
            <ActivityTimeline activities={activitiesData.activities} filterable />
          </div>
        )}

        {/* Prospect cards */}
        {todaysAllProspects.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {todaysAllProspects.map((prospect) => (
              <div key={String(prospect._id)} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{prospect.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{prospect.location}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{prospect.phone}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">Added today</p>
                  </div>
                  <StatusBadge status={prospect.status} className="shrink-0" />
                </div>
                {prospect.notes?.trim() && (
                  <p className="mt-1.5 flex items-start gap-1 rounded-lg bg-amber-50 p-1.5 text-[10px] text-amber-800">
                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    <span>{prospect.notes}</span>
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <a
                    href={`tel:${prospect.phone}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-[#E60012] transition hover:bg-red-50"
                    aria-label={`Call ${prospect.name}`}
                  >
                    <Phone className="h-3 w-3" /> Call
                  </a>
                  <a
                    href={buildWhatsAppUrl(prospect.phone, buildWhatsAppMessage({ customerName: prospect.name, dseName, title: prospect.title, location: prospect.location, notes: prospect.notes }))}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-green-600 transition hover:bg-green-50"
                    aria-label={`WhatsApp ${prospect.name}`}
                  >
                    <FaWhatsapp className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : activitiesData.activities.length === 0 ? (
          <p className="text-sm text-gray-500">No activity today yet.</p>
        ) : null}

        {showList && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {prospects.map((prospect) => (
              <ProspectCard key={String(prospect._id)} prospect={prospect} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
