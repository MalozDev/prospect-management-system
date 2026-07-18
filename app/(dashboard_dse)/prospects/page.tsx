"use client";

import Link from "next/link";
import { CalendarDays, ChartNoAxesCombined, Users, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { ProspectCard } from "@/components/shared/ProspectCard";
import { useApiData } from "@/lib/use-api-data";
import type { IProspect } from "@/lib/models/Prospect";

export default function ProspectsPage() {
  const { data } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const [showList, setShowList] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);
  const weekStart = useMemo(() => {
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    return ws.toISOString().slice(0, 10);
  }, []);

  const prospects = data.prospects;

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

  const todaysProspects = useMemo(
    () => prospects.filter((prospect) => prospect.createdAt === today).slice(0, 3),
    [prospects, today]
  );

  return (
    <PageShell title="Prospects" description="Track the customers you are engaging across the field.">
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-[#E60012]">
              <CalendarDays className="h-4 w-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">Today</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{createdToday}</p>
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

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Added today</p>
            <p className="text-xs text-gray-500">A quick view of the new prospects captured today.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowList((value) => !value)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#E60012] hover:text-[#E60012]"
          >
            {showList ? "Hide all" : "View all"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {todaysProspects.length > 0 ? (
            todaysProspects.map((prospect) => (
              <div key={String(prospect._id)} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{prospect.name}</p>
                <p className="mt-1 text-xs text-gray-500">{prospect.phone}</p>
                <p className="mt-1 text-xs text-gray-500">{prospect.location}</p>
                <p className="mt-2 text-xs text-[#E60012]">Status: {prospect.status}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No prospects added today yet.</p>
          )}
        </div>

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
