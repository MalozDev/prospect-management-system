"use client";

import { useMemo, useState } from "react";

import { StatCard } from "@/components/shared/StatCard";
interface SalePreview {
  _id?: unknown;
  id?: string;
  customer: string;
  packageName?: string;
  amount?: number;
  soldBy: string;
  date: string;
}
import { useTargets } from "@/lib/use-targets";
import {
  COMMISSION_PER_SALE,
  getCurrentMonth,
  getTodayIso,
  getWeekStartIso,
  targetZoneColor,
} from "@/lib/supervisor-utils";

interface DseSalesPanelProps {
  dseName: string;
  sales: SalePreview[];
  defaultExpanded?: boolean;
}

export function DseSalesPanel({ dseName, sales, defaultExpanded = false }: DseSalesPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showHistory, setShowHistory] = useState(false);

  const today = getTodayIso();
  const weekStart = getWeekStartIso();
  const currentMonth = getCurrentMonth();

  const todaySales = sales.filter((s) => s.date === today);
  const weekSales = sales.filter((s) => s.date >= weekStart && s.date <= today);
  const monthSales = sales.filter((s) => s.date.slice(0, 7) === currentMonth);
  const commissionThisMonth = monthSales.length * COMMISSION_PER_SALE;
  const targets = useTargets();
  const targetProgress = Math.min(100, Math.round((monthSales.length / targets.monthly) * 100));
  const ringStyle = {
    background: `conic-gradient(${targetZoneColor(targetProgress)} 0% ${targetProgress}%, #f3f4f6 ${targetProgress}% 100%)`,
  };

  const recentSales = useMemo(() => {
    return [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, showHistory ? sales.length : 3);
  }, [sales, showHistory]);

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
            {todaySales.length} ODU today · K{(sales.length * COMMISSION_PER_SALE).toLocaleString()} total
          </p>
        </div>
        <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-xs font-semibold text-[#E60012]">
          {expanded ? "Hide" : "View"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 pt-0">
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Today's Sales" value={String(todaySales.length)} hint="ODU sold today" className="p-3" />
            <StatCard label="Weekly Sales" value={String(weekSales.length)} hint="Past 7 days" className="p-3" />
            <StatCard label="Monthly Sales" value={String(monthSales.length)} hint="This month" className="p-3" />
            <StatCard
              label="Target Progress"
              value={`${targetProgress}%`}
              hint={`${monthSales.length}/${targets.monthly} sold`}
              className="p-3"
            />
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <div className="absolute inset-0 rounded-full" style={ringStyle} />
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white text-center">
                <p className="text-lg font-bold leading-none text-gray-900">{monthSales.length}</p>
                <p className="text-[9px] text-gray-500">of {targets.monthly}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Commission</p>
              <p className="text-lg font-bold text-gray-900">K {commissionThisMonth.toLocaleString()}</p>
              <p className="text-xs text-gray-500">K200 per ODU sale</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">ODU sales</p>
            {sales.length > 3 && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="text-xs font-semibold text-[#E60012]"
              >
                {showHistory ? "Show less" : "View all"}
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={String(sale._id ?? sale.id ?? sale.customer)} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{sale.customer}</p>
                    <p className="text-xs text-gray-500">ODU · {sale.date}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-gray-900">K{COMMISSION_PER_SALE}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No ODU sales logged yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
