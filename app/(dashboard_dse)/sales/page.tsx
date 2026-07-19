"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, TrendingUp } from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { StatCard } from "@/components/shared/StatCard";
import { useTargets } from "@/lib/use-targets";
import { useApiData } from "@/lib/use-api-data";
import type { ISale } from "@/lib/models/Sale";
import { COMMISSION_PER_SALE } from "@/lib/supervisor-utils";

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function shortMonth(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", {
    month: "short",
  });
}

export default function SalesPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);
  const previousMonth = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  }, [currentMonth]);
  const weekStart = useMemo(() => {
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    return ws.toISOString().slice(0, 10);
  }, []);

  const { data } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const sales = data.sales;

  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(sales.map((sale) => sale.date.slice(0, 7))))
      .sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showHistory, setShowHistory] = useState(false);

  const todaySales = useMemo(() => sales.filter((sale) => sale.date === today), [sales, today]);
  const weekSales = useMemo(() => sales.filter((sale) => sale.date >= weekStart && sale.date <= today), [sales, weekStart, today]);
  const monthSales = useMemo(() => sales.filter((sale) => sale.date.slice(0, 7) === currentMonth), [sales, currentMonth]);
  const selectedMonthSales = useMemo(() => sales.filter((sale) => sale.date.slice(0, 7) === selectedMonth), [sales, selectedMonth]);

  // Month-over-month
  const prevMonthCount = useMemo(
    () => sales.filter((s) => s.date.slice(0, 7) === previousMonth).length,
    [sales, previousMonth]
  );
  const monthChange = monthSales.length - prevMonthCount;

  // Monthly aggregation
  const monthlyStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sales) {
      const m = s.date.slice(0, 7);
      map.set(m, (map.get(m) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, count]) => ({ monthKey, count }));
  }, [sales]);

  const targets = useTargets();
  const commissionThisMonth = monthSales.length * COMMISSION_PER_SALE;
  const targetProgress = Math.min(100, Math.round((monthSales.length / targets.monthly) * 100));
  const currentAmount = Math.min(targets.monthly, monthSales.length);
  const currentProgress = Math.min(100, Math.round((currentAmount / targets.monthly) * 100));
  const getRingColor = (amount: number) => {
    const t = targets.monthly;
    if (amount >= t * 0.75) return "#16a34a";
    if (amount >= t * 0.50) return "#fb923c";
    if (amount >= t * 0.25) return "#facc15";
    return "#dc2626";
  };
  const ringStyle = {
    background: `conic-gradient(${getRingColor(currentAmount)} 0% ${currentProgress}%, #f3f4f6 ${currentProgress}% 100%)`,
  };

  return (
    <PageShell title="Sales" description="Track ODU sales, commission and monthly target progress.">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Today's Sales" value={String(todaySales.length)} hint="ODU sold today" />
        <StatCard label="Weekly Sales" value={String(weekSales.length)} hint="Past 7 days" />
        <StatCard label="Monthly Sales" value={String(monthSales.length)} hint="This month" />
        <StatCard label="Target Progress" value={`${targetProgress}%`} hint={`${monthSales.length}/${targets.monthly} sold`} />
      </div>

      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Monthly commission</h2>
            <p className="text-sm text-gray-500">K200 commission per ODU sale. Values reset month-to-month.</p>
          </div>
          <p className="text-sm font-semibold text-gray-900">K {commissionThisMonth.toLocaleString()}</p>
        </div>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-gray-50 p-3 sm:block sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-sm sm:h-56 sm:w-56">
              <div className="absolute inset-0 rounded-full border border-gray-200" style={ringStyle} />
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white px-2 text-center sm:inset-8">
                <p className="text-[8px] uppercase tracking-[0.2em] text-gray-500 sm:text-xs">Target</p>
                <p className="mt-0.5 text-2xl font-semibold leading-none text-gray-900 sm:mt-1 sm:text-4xl">{monthSales.length}</p>
                <p className="text-[11px] text-gray-500 sm:text-sm">of {targets.monthly}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#E60012] sm:mt-2 sm:text-sm">{targetProgress}%</p>
              </div>
            </div>

            <div className="min-w-[110px] rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm sm:mt-4 sm:min-w-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-left sm:shadow-none">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Commission</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">K {commissionThisMonth.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">Target levels</p>
              <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                {[
                  { color: "bg-red-600", label: "Level 1", desc: `0–${Math.floor(targets.monthly * 0.25)} sales — red zone` },
                  { color: "bg-yellow-400", label: "Level 2", desc: `${Math.ceil(targets.monthly * 0.25)}–${Math.floor(targets.monthly * 0.5)} sales — yellow zone` },
                  { color: "bg-orange-500", label: "Level 3", desc: `${Math.ceil(targets.monthly * 0.5)}–${Math.floor(targets.monthly * 0.75)} sales — orange zone` },
                  { color: "bg-emerald-600", label: "Level 4", desc: `${Math.ceil(targets.monthly * 0.75)}–${targets.monthly} sales — green zone` },
                ].map((level) => (
                  <div key={level.label} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:p-3">
                    <span className={`inline-flex h-3 w-3 rounded-full ${level.color}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{level.label}</p>
                      <p className="text-sm text-gray-500">{level.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-700">Current progress</p>
              <div className="mt-4 rounded-2xl bg-gray-100 p-4">
                <p className="text-sm text-gray-500">Sales this month</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{monthSales.length}</p>
                <p className="text-sm text-gray-500">Target is {targets.monthly} sales</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Month-over-Month ── */}
      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Month-over-Month</h2>
              <p className="text-sm text-gray-500">{monthLabel(currentMonth)} vs {monthLabel(previousMonth)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">This month</p>
              <p className="text-xl font-bold text-gray-900">{monthSales.length}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
              {monthChange > 0 ? (
                <ArrowUp className="h-4 w-4 text-emerald-600" />
              ) : monthChange < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-600" />
              ) : null}
              <span className={monthChange > 0 ? "text-emerald-600" : monthChange < 0 ? "text-red-600" : "text-gray-600"}>
                {monthChange > 0 ? "+" : ""}{monthChange}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Previous</p>
              <p className="text-xl font-bold text-gray-500">{prevMonthCount}</p>
            </div>
          </div>
        </div>

        {/* Comparison bars */}
        <div className="mx-auto flex w-44 items-end gap-6">
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center rounded-xl bg-gray-100">
              <div
                className="h-3/5 w-3/5 rounded-xl bg-[#E60012] transition-all"
                style={{
                  height: `${Math.min(100, (monthSales.length / Math.max(monthSales.length, prevMonthCount, 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] font-medium text-gray-500">Current</p>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center rounded-xl bg-gray-100">
              <div
                className="h-3/5 w-3/5 rounded-xl bg-gray-400 transition-all"
                style={{
                  height: `${Math.min(100, (prevMonthCount / Math.max(monthSales.length, prevMonthCount, 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] font-medium text-gray-500">Previous</p>
          </div>
        </div>
      </div>

      {/* ── Monthly Bar Chart ── */}
      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sales History</h2>
              <p className="text-sm text-gray-500">Monthly breakdown</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#E60012] hover:text-[#E60012]"
          >
            {showHistory ? "Hide" : "View details"}
          </button>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-2 overflow-x-auto pb-2 sm:gap-3">
          {monthlyStats.map(({ monthKey, count }) => {
            const maxCount = Math.max(...monthlyStats.map((m) => m.count), 1);
            return (
              <div
                key={monthKey}
                className="flex shrink-0 flex-col items-center gap-1.5"
                title={`${monthLabel(monthKey)}: ${count} sales`}
              >
                <p className="text-xs font-semibold text-gray-900">{count}</p>
                <div className="relative flex h-28 w-8 items-end rounded-lg bg-gray-100 sm:w-10">
                  <div
                    className={`w-full rounded-lg transition-all ${
                      count === maxCount ? "bg-[#E60012]" : count > 0 ? "bg-[#E60012]/60" : "bg-gray-200"
                    }`}
                    style={{ height: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-gray-500">{shortMonth(monthKey)}</p>
              </div>
            );
          })}
        </div>

        {showHistory && (
          <>
            <div className="mb-4 mt-6 max-w-xs">
              <label className="text-sm font-medium text-gray-700">Select month</label>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/20"
              >
                {uniqueMonths.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {monthLabel(monthKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Commission</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMonthSales.map((sale) => (
                    <tr key={String(sale._id)} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{sale.customer}</td>
                      <td className="px-4 py-3 text-gray-600">{sale.packageName}</td>
                      <td className="px-4 py-3 text-gray-600">K {COMMISSION_PER_SALE}</td>
                      <td className="px-4 py-3 text-gray-600">{sale.date}</td>
                    </tr>
                  ))}
                  {selectedMonthSales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        No sales recorded for {monthLabel(selectedMonth)}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
