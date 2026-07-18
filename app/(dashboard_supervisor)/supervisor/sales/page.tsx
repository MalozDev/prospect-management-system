"use client";

import { useState, useMemo } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { DseSalesPanel } from "@/components/supervisor/DseSalesPanel";
import { useApiData } from "@/lib/use-api-data";
import type { ISale } from "@/lib/models/Sale";
import { COMMISSION_PER_SALE, MONTHLY_SALES_TARGET } from "@/lib/supervisor-utils";

export default function SupervisorSalesPage() {
  const { data } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const [selectedDse, setSelectedDse] = useState("ALL");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);
  const weekStart = useMemo(() => {
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    return ws.toISOString().slice(0, 10);
  }, []);

  const sales = data.sales;

  const dseNames = useMemo(
    () => Array.from(new Set(sales.map((s) => s.soldBy))).filter(Boolean),
    [sales]
  );

  const filteredSales = useMemo(
    () => (selectedDse === "ALL" ? sales : sales.filter((s) => s.soldBy === selectedDse)),
    [sales, selectedDse]
  );

  const teamStats = useMemo(() => {
    const todaySales = filteredSales.filter((s) => s.date === today);
    const weekSales = filteredSales.filter((s) => s.date >= weekStart && s.date <= today);
    const monthSales = filteredSales.filter((s) => s.date.slice(0, 7) === currentMonth);
    const teamTarget = dseNames.length * MONTHLY_SALES_TARGET;
    const teamProgress = teamTarget > 0 ? Math.min(100, Math.round((monthSales.length / teamTarget) * 100)) : 0;

    return {
      todaySales: todaySales.length,
      weekSales: weekSales.length,
      monthSales: monthSales.length,
      teamCommission: monthSales.length * COMMISSION_PER_SALE,
      teamTarget,
      teamProgress,
    };
  }, [filteredSales, today, weekStart, currentMonth, dseNames.length]);

  const dseSalesData = useMemo(() => {
    const names = selectedDse === "ALL" ? dseNames : [selectedDse];
    return names.map((name) => {
      const dseSales = sales.filter((s) => s.soldBy === name);
      const dseTodaySales = dseSales.filter((s) => s.date === today).length;
      const dseWeekSales = dseSales.filter((s) => s.date >= weekStart && s.date <= today).length;
      const dseMonthSales = dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length;

      return {
        dseName: name,
        todaySales: dseTodaySales,
        weekSales: dseWeekSales,
        monthSales: dseMonthSales,
        totalSales: dseSales.length,
        commission: dseSales.length * COMMISSION_PER_SALE,
        dailyProgress: Math.min(100, Math.round((dseTodaySales / 1) * 100)),
        weeklyProgress: Math.min(100, Math.round((dseWeekSales / 6) * 100)),
        monthlyProgress: Math.min(100, Math.round((dseMonthSales / MONTHLY_SALES_TARGET) * 100)),
        dailyRemaining: Math.max(0, 1 - dseTodaySales),
        weeklyRemaining: Math.max(0, 6 - dseWeekSales),
        monthlyRemaining: Math.max(0, MONTHLY_SALES_TARGET - dseMonthSales),
      };
    }).sort((a, b) => b.monthSales - a.monthSales);
  }, [sales, selectedDse, dseNames, today, weekStart, currentMonth]);

  return (
    <PageShell title="Team Sales" description="ODU sales performance per DSE.">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Today</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{teamStats.todaySales}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Weekly</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{teamStats.weekSales}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Monthly</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{teamStats.monthSales}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Target</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{teamStats.teamProgress}%</p>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Commission summary</h2>
            <p className="text-sm text-gray-500">K200 commission per ODU sale.</p>
          </div>
          <p className="text-lg font-semibold text-[#E60012]">K {teamStats.teamCommission.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filter</label>
        <button
          type="button"
          onClick={() => setSelectedDse("ALL")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            selectedDse === "ALL" ? "bg-[#E60012] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All DSEs
        </button>
        {dseNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSelectedDse(name)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selectedDse === name ? "bg-[#E60012] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {dseSalesData.map((dse) => {
          const dseSales = sales.filter((s) => s.soldBy === dse.dseName);
          return (
            <DseSalesPanel key={dse.dseName} dseName={dse.dseName} sales={dseSales} />
          );
        })}
      </div>
    </PageShell>
  );
}
