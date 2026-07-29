"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Users,
  Calendar,
  Shield,
  MapPin,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  Target,
  Filter,
} from "lucide-react";
import Link from "next/link";

import { useApiData } from "@/lib/use-api-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { IProspect } from "@/lib/models/Prospect";
import type { IUser } from "@/lib/models/User";

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DeveloperProspectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dseFilter, setDseFilter] = useState<string>("all");

  const { data: prospectsData, loading, refetch } = useApiData<{ prospects: IProspect[] }>(
    "/api/prospects",
    { prospects: [] }
  );
  const { data: usersData } = useApiData<{ users: IUser[] }>("/api/users", { users: [] });

  const prospects = prospectsData.prospects;
  const users = usersData.users;

  // Build supervisor map
  const supervisorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of users) {
      if (u.role === "DSE") {
        map[u.name] = u.supervisor || "Unassigned";
      }
    }
    return map;
  }, [users]);

  // Get all DSE names with prospects
  const dseNames = useMemo(() => {
    const names = new Set(prospects.map((p) => p.assignedDse));
    return Array.from(names).sort();
  }, [prospects]);

  // Filter prospects
  const filteredProspects = useMemo(() => {
    let items = prospects;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.assignedDse.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.phone.includes(q)
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((p) => p.status === statusFilter);
    }

    if (dseFilter !== "all") {
      items = items.filter((p) => p.assignedDse === dseFilter);
    }

    return items;
  }, [prospects, search, statusFilter, dseFilter]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, IProspect[]> = {};
    for (const p of filteredProspects) {
      const date = p.createdAt || "unknown";
      if (!groups[date]) groups[date] = [];
      groups[date].push(p);
    }
    // Sort dates descending
    const sorted = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    return sorted;
  }, [filteredProspects]);

  // Stats
  const stats = useMemo(() => {
    const total = prospects.length;
    const today = prospects.filter((p) => p.createdAt && p.createdAt === new Date().toISOString().slice(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}-${m}-${d}`)).length;
    // Better approach for today
    const todayLocal = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const todayCount = prospects.filter((p) => p.createdAt === todayLocal).length;
    const sold = prospects.filter((p) => p.status === "SOLD").length;
    const active = prospects.filter((p) => p.status !== "SOLD" && p.status !== "LOST").length;
    return { total, today: todayCount, sold, active };
  }, [prospects]);

  return (
    <div className="max-w-full overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">All Prospects</h2>
            <p className="mt-1 text-sm text-gray-400">
              Every prospect across the system — organized by date, with DSE and supervisor info.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#252550] px-3 py-2 text-xs text-gray-300 transition hover:bg-[#2f2f60]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total</p>
          <p className="mt-1 text-lg font-bold text-purple-400 sm:text-xl">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Today</p>
          <p className="mt-1 text-lg font-bold text-orange-400 sm:text-xl">{stats.today}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Active</p>
          <p className="mt-1 text-lg font-bold text-blue-400 sm:text-xl">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Sold</p>
          <p className="mt-1 text-lg font-bold text-emerald-400 sm:text-xl">{stats.sold}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects by name, DSE, location..."
            className="h-10 w-full rounded-xl border border-gray-700/50 bg-[#1a1a3e] pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 sm:h-11 sm:pl-10 sm:pr-4 sm:text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-gray-700/50 bg-[#1a1a3e] px-3 text-xs text-gray-200 outline-none transition focus:border-purple-500/50 sm:h-11 sm:px-4 sm:text-sm"
          >
          <option value="all">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="FOLLOW UP">Follow Up</option>
          <option value="VISIT SCHEDULED">Visit Scheduled</option>
          <option value="SCHEDULEVISIT">Schedule Visit</option>
          <option value="ONSITE">Onsite</option>
          <option value="POSTPONED">Postponed</option>
          <option value="SOLD">Sold</option>
          <option value="LOST">Lost</option>
        </select>
          <select
            value={dseFilter}
            onChange={(e) => setDseFilter(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-gray-700/50 bg-[#1a1a3e] px-3 text-xs text-gray-200 outline-none transition focus:border-purple-500/50 sm:h-11 sm:px-4 sm:text-sm"
          >
            <option value="all">All DSEs</option>
            {dseNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-500" />
        </div>
      ) : groupedByDate.length > 0 ? (
        <div className="space-y-6">
          {groupedByDate.map(([date, items]) => (
            <div key={date} className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] overflow-hidden">
              {/* Date header */}
              <div className="flex items-center gap-3 border-b border-gray-700/50 bg-[#252550]/50 px-4 py-3">
                <Calendar className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">{formatDateGroup(date)}</h3>
                <span className="ml-auto rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-medium text-purple-300">
                  {items.length} prospect{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Prospects for this date */}
              <div className="divide-y divide-gray-700/30">
                {items.map((prospect) => {
                  const prospectId = String(prospect._id);
                  const supervisor = supervisorMap[prospect.assignedDse] || "Unassigned";
                  return (
                    <div
                      key={prospectId}
                      className="flex flex-col gap-2 px-4 py-3 transition hover:bg-[#252550]/30 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* DSE Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                          {prospect.assignedDse.charAt(0)}
                        </div>

                        {/* Prospect Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {prospect.name}
                            </span>
                            <StatusBadge status={prospect.status} />
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              DSE: {prospect.assignedDse}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Sup: {supervisor}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {prospect.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Phone & Link */}
                      <div className="flex shrink-0 items-center gap-2 pl-12 text-xs text-gray-500 sm:pl-0 sm:gap-3">
                        <span className="truncate max-w-[120px] sm:max-w-none">{prospect.phone}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-[#1a1a3e] py-16">
          <Target className="h-12 w-12 text-gray-600" />
          <p className="mt-4 text-sm text-gray-500">No prospects found.</p>
        </div>
      )}

      {/* Console log */}
      <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <TerminalIcon className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider sm:text-xs">Debug Console</p>
        </div>
        <pre className="text-[9px] sm:text-[10px] text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto max-w-full">
{`[PROSPECTS] Total: ${stats.total} | Today: ${stats.today} | Active: ${stats.active} | Sold: ${stats.sold}
[PROSPECTS] Date groups: ${groupedByDate.length} | Filtered: ${filteredProspects.length}
[PROSPECTS] Filters: status=${statusFilter} | dse=${dseFilter} | search="${search || "none"}"`}
        </pre>
      </div>
    </div>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}
