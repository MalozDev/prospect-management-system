"use client";

import { useEffect, useState, useMemo } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { StatCard } from "@/components/shared/StatCard";
import { DseSalesPanel } from "@/components/supervisor/DseSalesPanel";
import { sales as mockSales, type Sale } from "@/lib/mock-data";
import { DSE_TEAM } from "@/constants/dse-team";
import {
  COMMISSION_PER_SALE,
  getCurrentMonth,
  getTodayIso,
  getWeekStartIso,
  MONTHLY_SALES_TARGET,
} from "@/lib/supervisor-utils";

export default function SupervisorSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedDse, setSelectedDse] = useState("ALL");

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setSales(mockSales);
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  const today = getTodayIso();
  const weekStart = getWeekStartIso();
  const currentMonth = getCurrentMonth();

  const filteredSales = useMemo(() => {
    return sales.filter((s) => selectedDse === "ALL" || s.soldBy === selectedDse);
  }, [sales, selectedDse]);

  const stats = useMemo(() => {
    const todayCount = filteredSales.filter((s) => s.date === today).length;
    const weekCount = filteredSales.filter((s) => s.date >= weekStart && s.date <= today).length;
    const monthCount = filteredSales.filter((s) => s.date.slice(0, 7) === currentMonth).length;
    const commission = filteredSales.length * COMMISSION_PER_SALE;

    return { todayCount, weekCount, monthCount, commission, units: filteredSales.length };
  }, [filteredSales, today, weekStart, currentMonth]);

  const dseGroups = useMemo(() => {
    const names =
      selectedDse === "ALL"
        ? Array.from(new Set([...DSE_TEAM, ...sales.map((s) => s.soldBy)])).filter(Boolean)
        : [selectedDse];

    return names.map((name) => ({
      name,
      sales: filteredSales.filter((s) => s.soldBy === name),
    }));
  }, [filteredSales, sales, selectedDse]);

  return (
    <PageShell title="Team ODU Sales" description="Track ODU sales and commission per DSE.">
      {/* Team stats — DSE account style */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <StatCard label="Today's Sales" value={String(stats.todayCount)} hint="ODU sold today" />
        <StatCard label="Weekly Sales" value={String(stats.weekCount)} hint="Past 7 days" />
        <StatCard label="Monthly Sales" value={String(stats.monthCount)} hint="This month" />
        <StatCard
          label="Target Progress"
          value={`${Math.min(100, Math.round((stats.monthCount / (DSE_TEAM.length * MONTHLY_SALES_TARGET)) * 100))}%`}
          hint={`${stats.monthCount}/${DSE_TEAM.length * MONTHLY_SALES_TARGET} team ODU`}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Team commission</p>
            <p className="text-xs text-gray-500">K200 per ODU sale · {stats.units} total units</p>
          </div>
          <p className="text-xl font-bold text-gray-900">K {stats.commission.toLocaleString()}</p>
        </div>
      </div>

      {/* DSE filter */}
      <div className="mb-4 mt-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Filter by DSE
        </label>
        <select
          value={selectedDse}
          onChange={(e) => setSelectedDse(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#E60012]"
        >
          <option value="ALL">All DSEs ({DSE_TEAM.length} on board)</option>
          {Array.from(new Set([...DSE_TEAM, ...sales.map((s) => s.soldBy)]))
            .filter(Boolean)
            .map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
        </select>
      </div>

      {/* DSE groups — DSE sales layout on demand */}
      <div className="space-y-3">
        {dseGroups.map((group, index) => (
          <DseSalesPanel
            key={group.name}
            dseName={group.name}
            sales={group.sales}
            defaultExpanded={selectedDse !== "ALL" || index === 0}
          />
        ))}
      </div>

      {dseGroups.every((g) => g.sales.length === 0) && (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No ODU sales match the selected filter.
        </div>
      )}
    </PageShell>
  );
}
