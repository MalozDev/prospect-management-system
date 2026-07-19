"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  BarChart3,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { useApiData } from "@/lib/use-api-data";
import type { ISale } from "@/lib/models/Sale";
import {
  COMMISSION_PER_SALE,
  TEAM_TARGET,
} from "@/lib/supervisor-utils";

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function shortMonth(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", {
    month: "short",
  });
}

export default function SupervisorSalesPage() {
  const { data } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const allSales = data.sales;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);

  // ── Derived data ────────────────────────────────────────────

  const dseNames = useMemo(
    () => Array.from(new Set(allSales.map((s) => s.soldBy))).filter(Boolean).sort(),
    [allSales]
  );

  // Monthly aggregation for all sales
  const monthlyStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allSales) {
      const m = s.date.slice(0, 7);
      map.set(m, (map.get(m) ?? 0) + 1);
    }
    // Sort descending by month key
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, count]) => ({ monthKey, count }));
  }, [allSales]);

  const allTimeTotal = allSales.length;
  const allTimeCommission = allSales.length * COMMISSION_PER_SALE;

  // Current month stats
  const currentMonthSales = useMemo(
    () => allSales.filter((s) => s.date.slice(0, 7) === currentMonth),
    [allSales, currentMonth]
  );
  const thisMonthCount = currentMonthSales.length;
  const targetProgress = Math.min(100, Math.round((thisMonthCount / TEAM_TARGET) * 100));

  // Month-over-month: compare current month to previous month
  const previousMonth = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  }, [currentMonth]);

  const prevMonthCount = useMemo(
    () => allSales.filter((s) => s.date.slice(0, 7) === previousMonth).length,
    [allSales, previousMonth]
  );

  const monthChange = thisMonthCount - prevMonthCount;
  const monthChangePercent =
    prevMonthCount > 0 ? Math.round((monthChange / prevMonthCount) * 100) : thisMonthCount > 0 ? 100 : 0;

  // DSE leaderboard (all-time)
  const dseLeaderboard = useMemo(() => {
    return dseNames
      .map((name) => {
        const dseSales = allSales.filter((s) => s.soldBy === name);
        const dseMonthSales = dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length;
        const dsePrevMonthSales = dseSales.filter((s) => s.date.slice(0, 7) === previousMonth).length;
        const dseChange = dseMonthSales - dsePrevMonthSales;
        return {
          name,
          totalSales: dseSales.length,
          monthSales: dseMonthSales,
          prevMonthSales: dsePrevMonthSales,
          change: dseChange,
          revenue: dseSales.length * COMMISSION_PER_SALE,
          monthRevenue: dseMonthSales * COMMISSION_PER_SALE,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [dseNames, allSales, currentMonth, previousMonth]);

  const bestPerformer = dseLeaderboard[0];

  // Selected month for detail view
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const selectedMonthSales = useMemo(
    () => allSales.filter((s) => s.date.slice(0, 7) === selectedMonth),
    [allSales, selectedMonth]
  );

  const [expandedDse, setExpandedDse] = useState<string | null>(null);

  const getBarColor = (count: number, maxCount: number) => {
    if (maxCount === 0) return "bg-gray-200";
    const ratio = count / maxCount;
    if (ratio >= 0.75) return "bg-emerald-500";
    if (ratio >= 0.5) return "bg-[#E60012]";
    if (ratio >= 0.25) return "bg-orange-400";
    return "bg-yellow-400";
  };

  const maxMonthlyCount = Math.max(...monthlyStats.map((m) => m.count), 1);

  return (
    <PageShell title="Team Sales Analytics" description="ODU team performance, history, and leaderboard.">
      {/* ── Top KPI Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">All-time Sales</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{allTimeTotal}</p>
          <p className="mt-1 text-xs text-gray-500">K{allTimeCommission.toLocaleString()} commission</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">This Month</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{thisMonthCount}</p>
          <p className="mt-1 text-xs text-gray-500">of {TEAM_TARGET} target</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Target</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{targetProgress}%</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#E60012] transition-all"
              style={{ width: `${Math.min(100, targetProgress)}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Best Performer</p>
          {bestPerformer ? (
            <>
              <p className="mt-2 truncate text-lg font-bold text-gray-900">{bestPerformer.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {bestPerformer.totalSales} total · {bestPerformer.monthSales} this month
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-500">—</p>
          )}
        </div>
      </div>

      {/* ── Month-over-Month Comparison ── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Month-over-Month</h2>
            <p className="text-sm text-gray-500">Comparing {monthLabel(currentMonth)} vs {monthLabel(previousMonth)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">This month</p>
              <p className="text-xl font-bold text-gray-900">{thisMonthCount}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
              {monthChange > 0 ? (
                <ArrowUp className="h-4 w-4 text-emerald-600" />
              ) : monthChange < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-600" />
              ) : null}
              <span className={monthChange > 0 ? "text-emerald-600" : monthChange < 0 ? "text-red-600" : "text-gray-600"}>
                {monthChange > 0 ? "+" : ""}{monthChange} ({monthChangePercent > 0 ? "+" : ""}{monthChangePercent}%)
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Previous</p>
              <p className="text-xl font-bold text-gray-500">{prevMonthCount}</p>
            </div>
          </div>
        </div>

        {/* Comparison bars - mobile friendly */}
        <div className="flex items-end justify-center gap-8 sm:gap-12">
          <div className="flex flex-1 flex-col items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{thisMonthCount}</p>
            <div className="relative h-24 w-14 overflow-hidden rounded-xl bg-gray-100 sm:w-16">
              <div
                className="absolute bottom-0 w-full rounded-xl bg-[#E60012] transition-all"
                style={{
                  height: `${Math.min(100, (thisMonthCount / Math.max(thisMonthCount, prevMonthCount, 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] font-medium text-gray-500">Current</p>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <p className="text-sm font-semibold text-gray-500">{prevMonthCount}</p>
            <div className="relative h-24 w-14 overflow-hidden rounded-xl bg-gray-100 sm:w-16">
              <div
                className="absolute bottom-0 w-full rounded-xl bg-gray-400 transition-all"
                style={{
                  height: `${Math.min(100, (prevMonthCount / Math.max(thisMonthCount, prevMonthCount, 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] font-medium text-gray-500">Previous</p>
          </div>
        </div>
      </div>

      {/* ── Monthly Performance Bar Chart ── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Monthly Performance</h2>
            <p className="text-sm text-gray-500">Sales grouped by month</p>
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>

        <div className="flex items-end gap-2 overflow-x-auto pb-2 sm:gap-3">
          {monthlyStats.length > 0 ? (
            monthlyStats.map(({ monthKey, count }) => (
              <div
                key={monthKey}
                className="flex shrink-0 flex-col items-center gap-1.5"
                title={`${monthLabel(monthKey)}: ${count} sales`}
              >
                <p className="text-xs font-semibold text-gray-900">{count}</p>
                <div className="relative flex h-28 w-8 items-end rounded-lg bg-gray-100 sm:w-10">
                  <div
                    className={`w-full rounded-lg transition-all ${getBarColor(count, maxMonthlyCount)}`}
                    style={{ height: `${(count / maxMonthlyCount) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-gray-500">{shortMonth(monthKey)}</p>
              </div>
            ))
          ) : (
            <p className="w-full py-8 text-center text-sm text-gray-500">No sales data yet.</p>
          )}
        </div>
      </div>

      {/* ── DSE Leaderboard ── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">DSE Leaderboard</h2>
            <p className="text-sm text-gray-500">Ranked by all-time sales</p>
          </div>
          <Trophy className="h-5 w-5 text-yellow-500" />
        </div>

        <div className="space-y-3">
          {dseLeaderboard.map((dse, idx) => (
            <div key={dse.name} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      idx === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : idx === 1
                        ? "bg-gray-200 text-gray-600"
                        : idx === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{dse.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span>{dse.monthSales} this month</span>
                      {dse.change !== 0 && (
                        <span className={dse.change > 0 ? "text-emerald-600" : "text-red-600"}>
                          {dse.change > 0 ? "↑" : "↓"} {Math.abs(dse.change)} vs last month
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{dse.totalSales}</p>
                  <p className="text-xs text-gray-500">total</p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#E60012]"
                    style={{ width: `${(dse.totalSales / Math.max(dseLeaderboard[0]?.totalSales, 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">K{dse.revenue.toLocaleString()}</span>
              </div>

              <button
                type="button"
                onClick={() => setExpandedDse(expandedDse === dse.name ? null : dse.name)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-white py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {expandedDse === dse.name ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Recent sales <ChevronDown className="h-3 w-3" /></>
                )}
              </button>

              {expandedDse === dse.name && (
                <div className="mt-2 space-y-1.5">
                  {allSales
                    .filter((s) => s.soldBy === dse.name)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 5)
                    .map((sale) => (
                      <div key={String(sale._id)} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="font-medium text-gray-900 truncate">{sale.customer}</p>
                          <p className="text-xs text-gray-500 truncate">{sale.packageName}</p>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{sale.date}</span>
                      </div>
                    ))}
                  {allSales.filter((s) => s.soldBy === dse.name).length > 5 && (
                    <Link
                      href={`/supervisor/dse/${encodeURIComponent(dse.name)}`}
                      className="flex items-center justify-center gap-1 py-1 text-xs font-semibold text-[#E60012]"
                    >
                      View all <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}

          {dseLeaderboard.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No sales data yet.</p>
          )}
        </div>
      </div>

      {/* ── Detailed Monthly View ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sales History</h2>
            <p className="text-sm text-gray-500">Review detailed sales records by month.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/20"
            >
              {monthlyStats.map(({ monthKey }) => (
                <option key={monthKey} value={monthKey}>
                  {monthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile: card list */}
        <div className="space-y-2 md:hidden">
          {selectedMonthSales.length > 0 ? (
            selectedMonthSales.map((sale) => (
              <div key={String(sale._id)} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{sale.customer}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sale.soldBy}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{sale.packageName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">K{COMMISSION_PER_SALE}</p>
                    <p className="text-[10px] text-gray-500">{sale.date}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              No sales recorded for {monthLabel(selectedMonth)}.
            </p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-3xl border border-gray-200 shadow-sm md:block">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Sold By</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Commission</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedMonthSales.length > 0 ? (
                selectedMonthSales.map((sale) => (
                  <tr key={String(sale._id)} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{sale.customer}</td>
                    <td className="px-4 py-3 text-gray-600">{sale.soldBy}</td>
                    <td className="px-4 py-3 text-gray-600">{sale.packageName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">K{COMMISSION_PER_SALE}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{sale.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No sales recorded for {monthLabel(selectedMonth)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
          <span className="font-medium text-gray-700">Total for {monthLabel(selectedMonth)}</span>
          <span className="font-bold text-gray-900">{selectedMonthSales.length} sales · K{(selectedMonthSales.length * COMMISSION_PER_SALE).toLocaleString()}</span>
        </div>
      </div>
    </PageShell>
  );
}
