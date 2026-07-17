"use client";

import Link from "next/link";
import { CalendarDays, ChartNoAxesCombined, Users, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { ProspectCard } from "@/components/shared/ProspectCard";
import { prospects as mockProspects, type Prospect } from "@/lib/mock-data";

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        const stored = typeof window !== "undefined" ? localStorage.getItem("mockProspects") : null;
        const savedProspects = stored ? (JSON.parse(stored) as Prospect[]) : [];
        setProspects([...savedProspects, ...mockProspects]);
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const createdToday = prospects.filter((prospect) => prospect.createdAt === today).length;
  const createdThisWeek = prospects.filter(
    (prospect) => prospect.createdAt && prospect.createdAt >= weekStartIso && prospect.createdAt <= today,
  ).length;
  const createdThisMonth = prospects.filter(
    (prospect) => prospect.createdAt && prospect.createdAt.slice(0, 7) === currentMonth,
  ).length;
  const totalProspects = prospects.length;
  const todaysProspects = prospects.filter((prospect) => prospect.createdAt === today).slice(0, 3);

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
              <Link href="/followups" key={prospect.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{prospect.name}</p>
                <p className="mt-1 text-xs text-gray-500">{prospect.phone}</p>
                <p className="mt-1 text-xs text-gray-500">{prospect.location}</p>
                <p className="mt-2 text-xs text-[#E60012]">Status: {prospect.status}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-gray-500">No prospects added today yet.</p>
          )}
        </div>

        {showList && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {prospects.map((prospect) => (
              <ProspectCard key={prospect.id} prospect={prospect} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
