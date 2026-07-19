"use client";

import { CalendarDays, ChartNoAxesCombined, Sparkles, Users, Phone, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatRelativeTime } from "@/lib/time-utils";
interface ProspectPreview {
  _id?: unknown;
  id?: string;
  title?: string;
  name: string;
  phone: string;
  location: string;
  address?: string;
  expectedPurchaseDate: string;
  createdAt?: string;
  status: string;
  assignedDse: string;
  notes?: string;
  lastContacted?: string;
}
import { getTodayIso, getWeekStartIso, getCurrentMonth } from "@/lib/supervisor-utils";

interface DseProspectPanelProps {
  dseName: string;
  prospects: ProspectPreview[];
  defaultExpanded?: boolean;
}

export function DseProspectPanel({ dseName, prospects, defaultExpanded = false }: DseProspectPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);

  const today = getTodayIso();
  const weekStart = getWeekStartIso();
  const currentMonth = getCurrentMonth();

  const stats = useMemo(() => {
    const createdToday = prospects.filter((p) => p.createdAt === today).length;
    const createdThisWeek = prospects.filter(
      (p) => p.createdAt && p.createdAt >= weekStart && p.createdAt <= today,
    ).length;
    const createdThisMonth = prospects.filter(
      (p) => p.createdAt && p.createdAt.slice(0, 7) === currentMonth,
    ).length;

    return {
      today: createdToday,
      week: createdThisWeek,
      month: createdThisMonth,
      all: prospects.length,
    };
  }, [prospects, today, weekStart, currentMonth]);

  const todaysProspects = prospects.filter((p) => p.createdAt === today);
  const visibleProspects = showAll ? prospects : todaysProspects.slice(0, 3);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="font-semibold text-gray-900">{dseName}</p>
          <p className="text-xs text-gray-500">
            {stats.today} today · {stats.all} total prospects
          </p>
        </div>
        <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-xs font-semibold text-[#E60012]">
          {expanded ? "Hide" : "View"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 pt-0">
          <div className="mb-4 mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-2">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Today", value: stats.today, icon: CalendarDays },
                { label: "Week", value: stats.week, icon: ChartNoAxesCombined },
                { label: "Month", value: stats.month, icon: Sparkles },
                { label: "All", value: stats.all, icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-2 text-center">
                  <Icon className="mx-auto h-3 w-3 text-[#E60012]" />
                  <p className="mt-1 text-[9px] font-semibold uppercase text-gray-500">{label}</p>
                  <p className="text-sm font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Added today</p>
            {prospects.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-semibold text-[#E60012]"
              >
                {showAll ? "Show less" : "View all"}
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {visibleProspects.length > 0 ? (
              visibleProspects.map((prospect) => (
                <div key={String(prospect._id ?? prospect.id ?? prospect.name)} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{prospect.name}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          <a href={`tel:${prospect.phone}`} className="text-[#E60012] hover:underline">{prospect.phone}</a>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{prospect.location}</p>
                        {prospect.status === "CONTACTED" && prospect.lastContacted && (
                          <p className="mt-1 text-[10px] text-blue-600">📞 Contacted {formatRelativeTime(prospect.lastContacted)}</p>
                        )}
                        {prospect.notes?.trim() && (
                          <p className="mt-1 flex items-start gap-1 rounded-lg bg-amber-50 p-1.5 text-[10px] text-amber-800">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                            <span>{prospect.notes}</span>
                          </p>
                        )}
                      </div>
                    <StatusBadge status={prospect.status} className="shrink-0 px-2 py-0.5 text-[10px]" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No prospects added today.</p>
            )}
          </div>

          {showAll && prospects.length > todaysProspects.length && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">All prospects</p>
              {prospects
                .filter((p) => !todaysProspects.some((t) => String(t._id ?? t.id) === String(p._id ?? p.id)))
                .map((prospect) => (
                  <div key={String(prospect._id ?? prospect.id ?? prospect.name)} className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{prospect.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{prospect.location}</p>
                      </div>
                      <StatusBadge status={prospect.status} className="shrink-0 px-2 py-0.5 text-[10px]" />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
