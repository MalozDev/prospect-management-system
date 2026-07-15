"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { StatCard } from "@/components/shared/StatCard";
import { sales } from "@/lib/mock-data";

const COMMISSION_PER_SALE = 200;
const MONTHLY_TARGET = 25;

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function SalesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(sales.map((sale) => sale.date.slice(0, 7))))
      .sort((a, b) => b.localeCompare(a));
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showHistory, setShowHistory] = useState(false);

  const todaySales = sales.filter((sale) => sale.date === today);
  const weekSales = sales.filter((sale) => sale.date >= weekStartIso && sale.date <= today);
  const monthSales = sales.filter((sale) => sale.date.slice(0, 7) === currentMonth);
  const selectedMonthSales = sales.filter((sale) => sale.date.slice(0, 7) === selectedMonth);
  const commissionThisMonth = monthSales.length * COMMISSION_PER_SALE;
  const targetProgress = Math.min(100, Math.round((monthSales.length / MONTHLY_TARGET) * 100));
  const statusSteps = [6, 12, 18, 25];
  const currentAmount = Math.min(MONTHLY_TARGET, monthSales.length);
  const currentProgress = Math.min(100, Math.round((currentAmount / MONTHLY_TARGET) * 100));
  const getRingColor = (amount: number) => {
    if (amount >= 19) return "#16a34a";
    if (amount >= 13) return "#fb923c";
    if (amount >= 7) return "#facc15";
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
        <StatCard label="Target Progress" value={`${targetProgress}%`} hint={`${monthSales.length}/${MONTHLY_TARGET} sold`} />
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
                <p className="text-[11px] text-gray-500 sm:text-sm">of {MONTHLY_TARGET}</p>
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
                <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:p-3">
                  <span className="inline-flex h-3 w-3 rounded-full bg-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Level 1</p>
                    <p className="text-sm text-gray-500">0–6 sales — red zone</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:p-3">
                  <span className="inline-flex h-3 w-3 rounded-full bg-yellow-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Level 2</p>
                    <p className="text-sm text-gray-500">7–12 sales — yellow zone</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:p-3">
                  <span className="inline-flex h-3 w-3 rounded-full bg-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Level 3</p>
                    <p className="text-sm text-gray-500">13–18 sales — orange zone</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:p-3">
                  <span className="inline-flex h-3 w-3 rounded-full bg-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Level 4</p>
                    <p className="text-sm text-gray-500">19–25 sales — green zone</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-700">Current progress</p>
              <div className="mt-4 rounded-2xl bg-gray-100 p-4">
                <p className="text-sm text-gray-500">Sales this month</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{monthSales.length}</p>
                <p className="text-sm text-gray-500">Target is {MONTHLY_TARGET} sales</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sales history</h2>
            <p className="text-sm text-gray-500">Open this when you want to review specific month activity.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((value) => !value)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#E60012] hover:text-[#E60012]"
          >
            {showHistory ? "Hide history" : "View history"}
          </button>
        </div>

        {showHistory && (
          <>
            <div className="mb-4 max-w-xs">
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

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
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
                    <tr key={sale.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{sale.customer}</td>
                      <td className="px-4 py-3 text-gray-600">ODU</td>
                      <td className="px-4 py-3 text-gray-600">K {COMMISSION_PER_SALE}</td>
                      <td className="px-4 py-3 text-gray-600">{sale.date}</td>
                    </tr>
                  ))}
                  {selectedMonthSales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
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
