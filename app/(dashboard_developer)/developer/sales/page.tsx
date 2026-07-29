"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Calendar,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Users,
  Shield,
  ArrowUpRight,
  Award,
} from "lucide-react";

import { useApiData } from "@/lib/use-api-data";
import type { ISale } from "@/lib/models/Sale";
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

export default function DeveloperSalesPage() {
  const [search, setSearch] = useState("");
  const [dseFilter, setDseFilter] = useState<string>("all");

  const { data: salesData, loading, refetch } = useApiData<{ sales: ISale[] }>(
    "/api/sales",
    { sales: [] }
  );
  const { data: usersData } = useApiData<{ users: IUser[] }>("/api/users", { users: [] });

  const sales = salesData.sales;
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

  // Get all DSE names with sales
  const dseNames = useMemo(() => {
    const names = new Set(sales.map((s) => s.soldBy));
    return Array.from(names).sort();
  }, [sales]);

  // Calculate total revenue (commission)
  const totalRevenue = useMemo(() => sales.length * 200, [sales]);

  // Filter sales
  const filteredSales = useMemo(() => {
    let items = sales;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.customer.toLowerCase().includes(q) ||
          s.soldBy.toLowerCase().includes(q) ||
          s.packageName.toLowerCase().includes(q)
      );
    }

    if (dseFilter !== "all") {
      items = items.filter((s) => s.soldBy === dseFilter);
    }

    return items;
  }, [sales, search, dseFilter]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ISale[]> = {};
    for (const s of filteredSales) {
      const date = s.date || "unknown";
      if (!groups[date]) groups[date] = [];
      groups[date].push(s);
    }
    const sorted = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    return sorted;
  }, [filteredSales]);

  // Stats
  const todayLocal = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const currentMonth = todayLocal.slice(0, 7);

  const stats = useMemo(() => {
    const total = sales.length;
    const today = sales.filter((s) => s.date === todayLocal).length;
    const monthSales = sales.filter((s) => s.date.slice(0, 7) === currentMonth).length;
    const revenue = total * 200;
    const todayRevenue = today * 200;
    const monthRevenue = monthSales * 200;
    return { total, today, monthSales, revenue, todayRevenue, monthRevenue };
  }, [sales, todayLocal, currentMonth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">All Sales</h2>
            <p className="mt-1 text-sm text-gray-400">
              Every sale across the system — organized by date with DSE info.
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
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total Sales</p>
          <p className="mt-1 text-xl font-bold text-purple-400">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Today</p>
          <p className="mt-1 text-xl font-bold text-orange-400">{stats.today}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">This Month</p>
          <p className="mt-1 text-xl font-bold text-blue-400">{stats.monthSales}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-emerald-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Commission</p>
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-400">K{stats.revenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sales by customer, DSE, package..."
            className="h-11 w-full rounded-xl border border-gray-700/50 bg-[#1a1a3e] pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
          />
        </div>
        <select
          value={dseFilter}
          onChange={(e) => setDseFilter(e.target.value)}
          className="h-11 rounded-xl border border-gray-700/50 bg-[#1a1a3e] px-4 text-sm text-gray-200 outline-none transition focus:border-purple-500/50"
        >
          <option value="all">All DSEs</option>
          {dseNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
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
                <Calendar className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">{formatDateGroup(date)}</h3>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                    {items.length} sale{items.length !== 1 ? "s" : ""}
                  </span>
                  <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-medium text-purple-300">
                    K{(items.length * 200).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Sales for this date */}
              <div className="divide-y divide-gray-700/30">
                {items.map((sale) => {
                  const saleId = String(sale._id);
                  const supervisor = supervisorMap[sale.soldBy] || "Unassigned";
                  return (
                    <div
                      key={saleId}
                      className="flex items-center gap-4 px-4 py-3 transition hover:bg-[#252550]/30"
                    >
                      {/* DSE Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                        {sale.soldBy.charAt(0)}
                      </div>

                      {/* Sale Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {sale.customer}
                          </span>
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                            {sale.packageName}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            DSE: {sale.soldBy}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Sup: {supervisor}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-emerald-400">K200</p>
                        <p className="text-[10px] text-gray-500">commission</p>
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
          <ShoppingCart className="h-12 w-12 text-gray-600" />
          <p className="mt-4 text-sm text-gray-500">No sales found.</p>
        </div>
      )}

      {/* Console log */}
      <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-4">
        <div className="flex items-center gap-2 mb-2">
          <TerminalIcon className="h-4 w-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Debug Console</p>
        </div>
        <pre className="text-[10px] text-gray-500 font-mono leading-relaxed">
{`[SALES] Total: ${stats.total} | Today: ${stats.today} | Month: ${stats.monthSales} | Revenue: K${stats.revenue}
[SALES] Date groups: ${groupedByDate.length} | Filtered: ${filteredSales.length}
[SALES] Filters: dse=${dseFilter} | search="${search || "none"}"`}
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
