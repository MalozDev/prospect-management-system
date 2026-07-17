"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardList,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from "lucide-react";

import { PageShell } from "@/components/shared/PageShell";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { prospects as mockProspects, sales as mockSales, type Prospect, type Sale } from "@/lib/mock-data";
import {
  COMMISSION_PER_SALE,
  computeDseStats,
  getLiveFeedActivities,
  getStoredProspects,
  getTodayIso,
  groupTodayProspectsByDse,
  MONTHLY_SALES_TARGET,
  targetZoneColor,
} from "@/lib/supervisor-utils";
import { DSE_TEAM } from "@/constants/dse-team";

export default function SupervisorDashboardPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expandedDse, setExpandedDse] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        const stored = getStoredProspects();
        setProspects([...stored, ...mockProspects]);
        setSales(mockSales);
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  const today = getTodayIso();
  const dseStats = useMemo(() => computeDseStats(prospects, sales), [prospects, sales]);
  const todayByDse = useMemo(() => groupTodayProspectsByDse(prospects), [prospects]);
  const liveFeed = useMemo(() => getLiveFeedActivities().slice(0, 8), []);

  const stats = useMemo(() => {
    const todayProspects = prospects.filter((p) => p.createdAt === today).length;
    const todaySalesCount = sales.filter((s) => s.date === today).length;
    const totalRevenue = sales.length * COMMISSION_PER_SALE;
    const teamMonthSales = sales.filter((s) => s.date.slice(0, 7) === today.slice(0, 7)).length;
    const teamTarget = DSE_TEAM.length * MONTHLY_SALES_TARGET;
    const teamProgress = teamTarget > 0 ? Math.min(100, Math.round((teamMonthSales / teamTarget) * 100)) : 0;

    return {
      totalDse: DSE_TEAM.length,
      todayProspects,
      todaySales: todaySalesCount,
      totalRevenue,
      teamMonthSales,
      teamTarget,
      teamProgress,
    };
  }, [prospects, sales, today]);

  const ringStyle = {
    background: `conic-gradient(${targetZoneColor(stats.teamProgress)} 0% ${stats.teamProgress}%, #f3f4f6 ${stats.teamProgress}% 100%)`,
  };

  const todayDseEntries = Object.entries(todayByDse).sort((a, b) => b[1].length - a[1].length);

  return (
    <PageShell title="Supervisor Dashboard" description="ODU team performance and field activity.">
      {/* Top metrics — 2×2 on mobile */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard icon={Users} label="DSE on Board" value={String(stats.totalDse)} hint="Total team members" />
        <MetricCard
          icon={ClipboardList}
          label="Today's Prospects"
          value={String(stats.todayProspects)}
          hint="Captured today"
        />
        <MetricCard icon={TrendingUp} label="Today's Sales" value={String(stats.todaySales)} hint="ODU sold today" />
        <MetricCard
          icon={DollarSign}
          label="Total Revenue"
          value={`K${stats.totalRevenue.toLocaleString()}`}
          hint="K200 per ODU sale"
        />
      </div>

      {/* Today's prospects grouped by DSE */}
      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Today&apos;s Prospects by DSE</h3>
            <p className="text-xs text-gray-500">Grouped totals — tap to view details</p>
          </div>
          <Link href="/supervisor/prospects" className="shrink-0 text-xs font-semibold text-[#E60012]">
            View all
          </Link>
        </div>

        {todayDseEntries.length > 0 ? (
          <div className="space-y-2">
            {todayDseEntries.map(([dseName, dseProspects]) => {
              const isOpen = expandedDse === dseName;
              return (
                <div key={dseName} className="rounded-2xl border border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setExpandedDse(isOpen ? null : dseName)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff1f1] text-sm font-bold text-[#E60012]">
                        {dseProspects.length}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{dseName}</p>
                        <p className="text-xs text-gray-500">
                          {dseProspects.length} prospect{dseProspects.length !== 1 ? "s" : ""} today
                        </p>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="space-y-2 border-t border-gray-200 p-3 pt-0">
                      {dseProspects.map((prospect) => (
                        <div key={prospect.id} className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">{prospect.name}</p>
                              <p className="mt-0.5 truncate text-xs text-gray-500">{prospect.phone}</p>
                              <p className="mt-0.5 truncate text-xs text-gray-500">{prospect.location}</p>
                            </div>
                            <StatusBadge status={prospect.status} className="shrink-0 px-2 py-0.5 text-[10px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-500">No prospects captured today yet.</p>
        )}
      </div>

      {/* DSE Performance + Team target */}
      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-6">
        <div className="flex flex-col items-center rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-3 self-start text-sm font-semibold text-gray-900">Team Monthly Target</h3>
          <div
            className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-sm sm:h-44 sm:w-44"
            style={ringStyle}
          >
            <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white px-2 text-center sm:inset-5">
              <p className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl">{stats.teamMonthSales}</p>
              <p className="mt-1 text-[10px] text-gray-500 sm:text-[11px]">of {stats.teamTarget} ODU</p>
              <p className="mt-1 text-xs font-bold text-[#E60012] sm:text-sm">{stats.teamProgress}%</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">K200 commission per ODU sale</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base">DSE Performance</h3>
              <p className="text-xs text-gray-500">Prospects, sales &amp; target gaps (daily / weekly / monthly)</p>
            </div>
            <Link href="/supervisor/sales" className="shrink-0 text-xs font-semibold text-[#E60012]">
              Sales
            </Link>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 lg:hidden">
            {dseStats.map((dse) => (
              <DsePerformanceCard key={dse.name} dse={dse} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">DSE</th>
                  <th className="px-3 py-2.5 text-center">Prospects</th>
                  <th className="px-3 py-2.5 text-center">Sales</th>
                  <th className="px-3 py-2.5 text-center">Daily</th>
                  <th className="px-3 py-2.5 text-center">Weekly</th>
                  <th className="px-3 py-2.5 text-center">Monthly</th>
                  <th className="px-3 py-2.5 text-right">Revenue</th>
                  <th className="px-3 py-2.5 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dseStats.map((dse) => (
                  <tr key={dse.name} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-semibold text-gray-900">{dse.name}</td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {dse.prospectsCount}
                      <span className="block text-[10px] text-[#E60012]">+{dse.todayProspects} today</span>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-gray-900">{dse.salesCount}</td>
                    <td className="px-3 py-3 text-center">
                      <TargetCell current={dse.todaySales} remaining={dse.dailyRemaining} progress={dse.dailyProgress} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <TargetCell current={dse.weekSales} remaining={dse.weeklyRemaining} progress={dse.weeklyProgress} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <TargetCell
                        current={dse.monthSales}
                        remaining={dse.monthlyRemaining}
                        progress={dse.monthlyProgress}
                      />
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      K{dse.revenue.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/supervisor/dse/${encodeURIComponent(dse.name)}`}
                        className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#E60012]"
                      >
                        Details <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live feed — prospect created & follow up only */}
      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5">
        <h3 className="mb-1 text-sm font-semibold text-gray-900 sm:text-base">Team Live Field Feed</h3>
        <p className="mb-4 text-xs text-gray-500">Prospect created &amp; follow-up activity only</p>
        <ActivityTimeline activities={liveFeed} compact />
      </div>
    </PageShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E60012] sm:h-10 sm:w-10 sm:rounded-2xl">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
            {label}
          </p>
          <p className="mt-0.5 truncate text-lg font-bold text-gray-900 sm:mt-1 sm:text-2xl">{value}</p>
        </div>
      </div>
      <p className="mt-1.5 hidden text-xs text-gray-500 sm:block">{hint}</p>
    </div>
  );
}

function TargetCell({
  current,
  remaining,
  progress,
}: {
  current: number;
  remaining: number;
  progress: number;
}) {
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-gray-900">{current}</span>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-[#E60012]" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] text-gray-500">
        {remaining > 0 ? `${remaining} to go` : "Met"}
      </span>
    </div>
  );
}

function DsePerformanceCard({
  dse,
}: {
  dse: ReturnType<typeof computeDseStats>[number];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{dse.name}</p>
          <p className="text-xs text-gray-500">
            {dse.prospectsCount} prospects · {dse.salesCount} ODU sales
          </p>
        </div>
        <Link
          href={`/supervisor/dse/${encodeURIComponent(dse.name)}`}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#E60012]"
        >
          Details <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <TargetBar label="Daily" current={dse.todaySales} remaining={dse.dailyRemaining} progress={dse.dailyProgress} />
        <TargetBar label="Weekly" current={dse.weekSales} remaining={dse.weeklyRemaining} progress={dse.weeklyProgress} />
        <TargetBar
          label="Monthly"
          current={dse.monthSales}
          remaining={dse.monthlyRemaining}
          progress={dse.monthlyProgress}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500">+{dse.todayProspects} prospects today</span>
        <span className="font-semibold text-gray-900">K{dse.revenue.toLocaleString()}</span>
      </div>
    </div>
  );
}

function TargetBar({
  label,
  current,
  remaining,
  progress,
}: {
  label: string;
  current: number;
  remaining: number;
  progress: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 text-center">
      <p className="text-[9px] font-semibold uppercase text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{current}</p>
      <div className="mx-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-[#E60012]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-0.5 text-[9px] text-gray-500">{remaining > 0 ? `${remaining} left` : "Done"}</p>
    </div>
  );
}
