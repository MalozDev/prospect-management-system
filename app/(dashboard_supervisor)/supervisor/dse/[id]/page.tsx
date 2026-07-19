"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Trophy,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Activity,
  StickyNote,
} from "lucide-react";

import { PageShell } from "@/components/shared/PageShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { useApiData } from "@/lib/use-api-data";
import type { IProspect } from "@/lib/models/Prospect";
import type { ISale } from "@/lib/models/Sale";
import type { IActivity } from "@/lib/models/Activity";
import { COMMISSION_PER_SALE } from "@/lib/supervisor-utils";
import { useTargets } from "@/lib/use-targets";
import { formatRelativeTime } from "@/lib/time-utils";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

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

export default function DseDetailPage({ params }: PageProps) {
  const targets = useTargets();
  const [dseName, setDseName] = useState<string>("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>("");

  // Safely unwrap Next.js 15/16 async params
  useEffect(() => {
    Promise.resolve(params).then((resolved) => {
      setDseName(decodeURIComponent(resolved.id));
    });
  }, [params]);

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

  const { data: prospectsData } = useApiData<{ prospects: IProspect[] }>(
    dseName ? `/api/prospects?assignedDse=${encodeURIComponent(dseName)}` : null,
    { prospects: [] }
  );
  const { data: salesData } = useApiData<{ sales: ISale[] }>(
    dseName ? `/api/sales?soldBy=${encodeURIComponent(dseName)}` : null,
    { sales: [] }
  );
  const { data: activitiesData } = useApiData<{ activities: IActivity[] }>(
    dseName ? `/api/activities?limit=20` : null,
    { activities: [] }
  );

  const dseProspects = prospectsData.prospects;
  const dseSales = salesData.sales;

  // Set selected month once data loads
  useEffect(() => {
    if (dseSales.length > 0 && !selectedHistoryMonth) {
      const months = Array.from(new Set(dseSales.map((s) => s.date.slice(0, 7))))
        .sort((a, b) => b.localeCompare(a));
      setSelectedHistoryMonth(months[0] || currentMonth);
    }
  }, [dseSales, currentMonth, selectedHistoryMonth]);

  // ── Core Stats ──
  const stats = useMemo(() => {
    const pCount = dseProspects.length;
    const sCount = dseSales.length;
    const convRate = pCount > 0 ? Math.round((sCount / pCount) * 100) : 0;
    const comm = sCount * COMMISSION_PER_SALE;

    // Today / Week / Month sales
    const todaySales = dseSales.filter((s) => s.date === today).length;
    const weekSales = dseSales.filter((s) => s.date >= weekStart && s.date <= today).length;
    const monthSales = dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length;

    // Previous month
    const prevMonthSales = dseSales.filter((s) => s.date.slice(0, 7) === previousMonth).length;

    // Today / Week / Month prospects
    const todayProspects = dseProspects.filter((p) => p.createdAt === today).length;
    const weekProspects = dseProspects.filter((p) => p.createdAt >= weekStart && p.createdAt <= today).length;
    const monthProspects = dseProspects.filter((p) => p.createdAt.slice(0, 7) === currentMonth).length;

    // Target progress
    const dailyProgress = Math.min(100, Math.round((todaySales / targets.daily) * 100));
    const weeklyProgress = Math.min(100, Math.round((weekSales / targets.weekly) * 100));
    const monthlyProgress = Math.min(100, Math.round((monthSales / targets.monthly) * 100));

    // Month-over-month change
    const monthChange = monthSales - prevMonthSales;
    const monthChangePercent = prevMonthSales > 0
      ? Math.round((monthChange / prevMonthSales) * 100)
      : monthSales > 0 ? 100 : 0;

    return {
      prospectsCount: pCount,
      salesCount: sCount,
      conversionRate: convRate,
      revenue: comm,
      commission: comm,
      todaySales,
      weekSales,
      monthSales,
      prevMonthSales,
      todayProspects,
      weekProspects,
      monthProspects,
      dailyProgress,
      weeklyProgress,
      monthlyProgress,
      monthChange,
      monthChangePercent,
      dailyRemaining: Math.max(0, targets.daily - todaySales),
      weeklyRemaining: Math.max(0, targets.weekly - weekSales),
      monthlyRemaining: Math.max(0, targets.monthly - monthSales),
    };
  }, [dseProspects, dseSales, today, weekStart, currentMonth, previousMonth, targets]);

  // ── Monthly Breakdown ──
  const monthlyStats = useMemo(() => {
    const salesMap = new Map<string, number>();
    const prospectsMap = new Map<string, number>();
    const allMonths = new Set<string>();

    for (const s of dseSales) {
      const m = s.date.slice(0, 7);
      salesMap.set(m, (salesMap.get(m) ?? 0) + 1);
      allMonths.add(m);
    }
    for (const p of dseProspects) {
      const m = p.createdAt.slice(0, 7);
      prospectsMap.set(m, (prospectsMap.get(m) ?? 0) + 1);
      allMonths.add(m);
    }

    return Array.from(allMonths)
      .sort((a, b) => b.localeCompare(a))
      .map((monthKey) => ({
        monthKey,
        sales: salesMap.get(monthKey) ?? 0,
        prospects: prospectsMap.get(monthKey) ?? 0,
      }));
  }, [dseSales, dseProspects]);

  const maxMonthlySales = Math.max(...monthlyStats.map((m) => m.sales), 1);
  const bestMonth = useMemo(() => {
    if (monthlyStats.length === 0) return null;
    return monthlyStats.reduce((best, curr) => (curr.sales > best.sales ? curr : best));
  }, [monthlyStats]);

  const worstMonth = useMemo(() => {
    if (monthlyStats.length === 0) return null;
    return monthlyStats.reduce((worst, curr) => (curr.sales < worst.sales ? curr : worst));
  }, [monthlyStats]);

  // ── Performance Insights ──
  const insights = useMemo(() => {
    const tips: string[] = [];
    if (stats.monthlyRemaining > 0) {
      const daysLeftInMonth = new Date(today.slice(0, 7) + "-01").getMonth() === new Date().getMonth()
        ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
        : 30;
      if (stats.monthlyRemaining > 0 && daysLeftInMonth > 0) {
        const neededPerDay = Math.ceil(stats.monthlyRemaining / daysLeftInMonth);
        tips.push(`Need ${neededPerDay} sale${neededPerDay > 1 ? "s" : ""} per day to hit monthly target.`);
      }
    }
    if (stats.todaySales === 0) {
      tips.push("No sales today — encourage field presence and follow-up calls.");
    }
    if (stats.conversionRate < 20 && stats.prospectsCount > 10) {
      tips.push(`Conversion rate is ${stats.conversionRate}% — focus on quality follow-ups and closing techniques.`);
    } else if (stats.conversionRate >= 40) {
      tips.push(`Excellent conversion rate (${stats.conversionRate}%) — strong closing skills.`);
    }
    if (stats.monthChange > 0) {
      tips.push(`${stats.monthChange} more sales than last month — positive momentum!`);
    } else if (stats.monthChange < 0) {
      tips.push(`${Math.abs(stats.monthChange)} fewer sales than last month — needs motivation.`);
    }
    if (stats.dailyRemaining === 0 && stats.todaySales > 0) {
      tips.push(`Daily target met! Already ${stats.todaySales} sale${stats.todaySales > 1 ? "s" : ""} today.`);
    }
    if (stats.weeklyRemaining <= 2 && stats.weeklyRemaining > 0) {
      tips.push(`Only ${stats.weeklyRemaining} sale${stats.weeklyRemaining > 1 ? "s" : ""} away from weekly target!`);
    }
    if (bestMonth && bestMonth.monthKey !== currentMonth) {
      const bestCount = bestMonth.sales;
      tips.push(`Best month was ${monthLabel(bestMonth.monthKey)} with ${bestCount} sales.`);
    }
    return tips;
  }, [stats, bestMonth, currentMonth, today]);

  // ── Sales history ──
  const selectedMonthSales = useMemo(
    () => dseSales.filter((s) => s.date.slice(0, 7) === selectedHistoryMonth),
    [dseSales, selectedHistoryMonth]
  );

  const historyMonths = useMemo(
    () => Array.from(new Set(dseSales.map((s) => s.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)),
    [dseSales]
  );

  // ── DSE's prospects with upcoming/overdue status ──
  const activeProspects = useMemo(
    () => dseProspects
      .filter((p) => p.status !== "SOLD" && p.status !== "LOST")
      .sort((a, b) => a.expectedPurchaseDate.localeCompare(b.expectedPurchaseDate)),
    [dseProspects]
  );

  // Filter activities for this DSE
  const dseActivities = useMemo(
    () => activitiesData.activities
      .filter((a) => a.detail?.toLowerCase().includes(dseName.toLowerCase()) || a.title?.toLowerCase().includes(dseName.toLowerCase()))
      .slice(0, 8),
    [activitiesData.activities, dseName]
  );

  if (!dseName) {
    return (
      <PageShell title="Loading..." description="Loading DSE details.">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#E60012]" />
        </div>
      </PageShell>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <PageShell title={`${dseName}`} description="Full performance breakdown — sales, prospects, trends, and insights.">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/supervisor/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-[#E60012] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      {/* ── KPI Row ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Total Sales</p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{stats.salesCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Prospects</p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{stats.prospectsCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Conversion</p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{stats.conversionRate}%</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Revenue</p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">K{stats.revenue.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">This Month</p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{stats.monthSales}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Target</p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{stats.monthlyProgress}%</p>
        </div>
      </div>

      {/* ── Target Progress Section ── */}
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-[#E60012]" />
          <h2 className="text-lg font-semibold text-gray-900">Target Progress</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Daily */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Daily Target</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{stats.todaySales} <span className="text-sm font-normal text-gray-500">/ {targets.daily}</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-[#E60012] transition-all" style={{ width: `${Math.min(100, stats.dailyProgress)}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {stats.dailyRemaining === 0 ? "✅ Target met!" : `${stats.dailyRemaining} remaining`}
            </p>
          </div>

          {/* Weekly */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Weekly Target</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{stats.weekSales} <span className="text-sm font-normal text-gray-500">/ {targets.weekly}</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-[#E60012] transition-all" style={{ width: `${Math.min(100, stats.weeklyProgress)}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {stats.weeklyRemaining === 0 ? "✅ Target met!" : `${stats.weeklyRemaining} remaining`}
            </p>
          </div>

          {/* Monthly */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Monthly Target</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{stats.monthSales} <span className="text-sm font-normal text-gray-500">/ {targets.monthly}</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-[#E60012] transition-all" style={{ width: `${Math.min(100, stats.monthlyProgress)}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {stats.monthlyRemaining === 0 ? "✅ Target met!" : `${stats.monthlyRemaining} remaining`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Month-over-Month Comparison ── */}
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Month-over-Month</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
            {stats.monthChange > 0 ? (
              <ArrowUp className="h-4 w-4 text-emerald-600" />
            ) : stats.monthChange < 0 ? (
              <ArrowDown className="h-4 w-4 text-red-600" />
            ) : null}
            <span className={stats.monthChange > 0 ? "text-emerald-600" : stats.monthChange < 0 ? "text-red-600" : "text-gray-600"}>
              {stats.monthChange > 0 ? "+" : ""}{stats.monthChange} ({stats.monthChangePercent > 0 ? "+" : ""}{stats.monthChangePercent}%)
            </span>
          </div>
        </div>

        <div className="flex items-end justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500">Previous ({shortMonth(previousMonth)})</p>
            <p className="text-2xl font-bold text-gray-500">{stats.prevMonthSales}</p>
            <div className="relative h-28 w-14 overflow-hidden rounded-xl bg-gray-100">
              <div
                className="absolute bottom-0 w-full rounded-xl bg-gray-400 transition-all"
                style={{ height: `${(stats.prevMonthSales / Math.max(stats.monthSales, stats.prevMonthSales, 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500">Current ({shortMonth(currentMonth)})</p>
            <p className="text-2xl font-bold text-[#E60012]">{stats.monthSales}</p>
            <div className="relative h-28 w-14 overflow-hidden rounded-xl bg-gray-100">
              <div
                className="absolute bottom-0 w-full rounded-xl bg-[#E60012] transition-all"
                style={{ height: `${(stats.monthSales / Math.max(stats.monthSales, stats.prevMonthSales, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Performance Bar Chart ── */}
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Monthly Performance</h2>
              <p className="text-xs text-gray-500">Sales &amp; prospects per month</p>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {monthlyStats.map(({ monthKey, sales, prospects }) => (
            <div key={monthKey} className="flex shrink-0 flex-col items-center gap-2" title={`${monthLabel(monthKey)}: ${sales} sales, ${prospects} prospects`}>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-[#E60012]">{sales}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">{prospects}</span>
              </div>
              <div className="relative flex h-32 w-10 items-end rounded-lg bg-gray-100">
                {/* Sales bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-10 rounded-lg bg-[#E60012] transition-all"
                  style={{ height: `${(sales / maxMonthlySales) * 100}%` }}
                />
                {/* Prospects overlay (thin line at top) */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-20 rounded-lg bg-blue-400/40 transition-all"
                  style={{ height: `${(prospects / Math.max(maxMonthlySales, 1)) * 100}%` }}
                />
              </div>
              <p className="text-[10px] font-medium text-gray-500">{shortMonth(monthKey)}</p>
            </div>
          ))}
          {monthlyStats.length === 0 && (
            <p className="w-full py-8 text-center text-sm text-gray-500">No data yet for this DSE.</p>
          )}
        </div>

        {bestMonth && worstMonth && monthlyStats.length > 1 && (
          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
              Best: {shortMonth(bestMonth.monthKey)} ({bestMonth.sales})
            </span>
            <span className="flex items-center gap-1">
              <ArrowDown className="h-3.5 w-3.5 text-red-400" />
              Lowest: {shortMonth(worstMonth.monthKey)} ({worstMonth.sales})
            </span>
          </div>
        )}
      </div>

      {/* ── Performance Insights ── */}
      {insights.length > 0 && (
        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900">Insights</h2>
          </div>
          <ul className="space-y-2">
            {insights.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Active Prospects ── */}
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("prospects")}
          className="flex w-full items-center justify-between p-4 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Active Prospects</h2>
              <p className="text-xs text-gray-500">{activeProspects.length} active · {stats.monthProspects} this month</p>
            </div>
          </div>
          {expandedSection === "prospects" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {expandedSection === "prospects" && (
          <div className="border-t border-gray-100 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="mt-4 space-y-3">
              {activeProspects.length > 0 ? (
                activeProspects.map((prospect) => (
                  <div key={String(prospect._id)} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900">{prospect.name}</h4>
                        <p className="mt-0.5 text-xs text-gray-500">{prospect.location}</p>
                        {prospect.status === "CONTACTED" && prospect.lastContacted && (
                          <p className="mt-1 text-[10px] text-blue-600">📞 Contacted {formatRelativeTime(prospect.lastContacted)}</p>
                        )}
                        {prospect.notes?.trim() && (
                          <p className="mt-1.5 flex items-start gap-1 rounded-lg bg-amber-50 p-1.5 text-[10px] text-amber-800">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                            <span>{prospect.notes}</span>
                          </p>
                        )}
                      </div>
                      <StatusBadge status={prospect.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span>📞 <a href={`tel:${prospect.phone}`} className="text-[#E60012] hover:underline">{prospect.phone}</a></span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {prospect.expectedPurchaseDate}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No active prospects.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sales History ── */}
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("sales")}
          className="flex w-full items-center justify-between p-4 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sales History</h2>
              <p className="text-xs text-gray-500">{dseSales.length} total · K{stats.revenue.toLocaleString()} commission</p>
            </div>
          </div>
          {expandedSection === "sales" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {expandedSection === "sales" && (
          <div className="border-t border-gray-100 px-4 pb-4 sm:px-6 sm:pb-6">
            {historyMonths.length > 0 && (
              <div className="mt-4 max-w-xs">
                <select
                  value={selectedHistoryMonth}
                  onChange={(e) => setSelectedHistoryMonth(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/20"
                >
                  {historyMonths.map((m) => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {selectedMonthSales.length > 0 ? (
                selectedMonthSales.map((sale) => (
                  <div key={String(sale._id)} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-gray-200">
                    <div>
                      <h4 className="font-semibold text-gray-900">{sale.customer}</h4>
                      <p className="text-xs text-gray-500">ODU · {sale.date}</p>
                    </div>
                    <p className="font-bold text-gray-900">K{COMMISSION_PER_SALE}</p>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No sales for this month.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("activity")}
          className="flex w-full items-center justify-between p-4 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-xs text-gray-500">Latest field actions</p>
            </div>
          </div>
          {expandedSection === "activity" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {expandedSection === "activity" && (
          <div className="border-t border-gray-100 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="mt-4">
              <ActivityTimeline activities={dseActivities.length > 0 ? dseActivities : activitiesData.activities.slice(0, 8)} compact />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
