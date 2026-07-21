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
  Hash,
  MapPin,
} from "lucide-react";

import { ProfileAvatar } from "@/components/shared/ProfileAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { useApiData } from "@/lib/use-api-data";
import type { IUser } from "@/lib/models/User";
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

export default function DevDseDetailPage({ params }: PageProps) {
  const targets = useTargets();
  const [dseName, setDseName] = useState<string>("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>("");

  useEffect(() => {
    Promise.resolve(params).then((resolved) => {
      setDseName(decodeURIComponent(resolved.id));
    });
  }, [params]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const currentMonth = today.slice(0, 7);
  const previousMonth = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  }, [currentMonth]);
  const weekStart = useMemo(() => {
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`;
  }, []);

  const { data: usersData } = useApiData<{ users: IUser[] }>("/api/users", { users: [] });
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

  const dseUserInfo = useMemo(
    () => usersData.users.find((u) => u.name === dseName && u.role === "DSE"),
    [usersData.users, dseName]
  );

  const dseProspects = prospectsData.prospects;
  const dseSales = salesData.sales;

  useEffect(() => {
    if (dseSales.length > 0 && !selectedHistoryMonth) {
      const months = Array.from(new Set(dseSales.map((s) => s.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a));
      setSelectedHistoryMonth(months[0] || currentMonth);
    }
  }, [dseSales, currentMonth, selectedHistoryMonth]);

  const stats = useMemo(() => {
    const pCount = dseProspects.length;
    const sCount = dseSales.length;
    const convRate = pCount > 0 ? Math.round((sCount / pCount) * 100) : 0;
    const comm = sCount * COMMISSION_PER_SALE;

    const todaySales = dseSales.filter((s) => s.date === today).length;
    const weekSales = dseSales.filter((s) => s.date >= weekStart && s.date <= today).length;
    const monthSales = dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length;
    const prevMonthSales = dseSales.filter((s) => s.date.slice(0, 7) === previousMonth).length;
    const todayProspects = dseProspects.filter((p) => p.createdAt === today).length;
    const weekProspects = dseProspects.filter((p) => p.createdAt >= weekStart && p.createdAt <= today).length;
    const monthProspects = dseProspects.filter((p) => p.createdAt.slice(0, 7) === currentMonth).length;

    const dailyProgress = Math.min(100, Math.round((todaySales / targets.daily) * 100));
    const weeklyProgress = Math.min(100, Math.round((weekSales / targets.weekly) * 100));
    const monthlyProgress = Math.min(100, Math.round((monthSales / targets.monthly) * 100));
    const monthChange = monthSales - prevMonthSales;
    const monthChangePercent = prevMonthSales > 0 ? Math.round((monthChange / prevMonthSales) * 100) : monthSales > 0 ? 100 : 0;

    return {
      prospectsCount: pCount,
      salesCount: sCount,
      conversionRate: convRate,
      revenue: comm,
      commission: comm,
      todaySales, weekSales, monthSales, prevMonthSales,
      todayProspects, weekProspects, monthProspects,
      dailyProgress, weeklyProgress, monthlyProgress,
      monthChange, monthChangePercent,
      dailyRemaining: Math.max(0, targets.daily - todaySales),
      weeklyRemaining: Math.max(0, targets.weekly - weekSales),
      monthlyRemaining: Math.max(0, targets.monthly - monthSales),
    };
  }, [dseProspects, dseSales, today, weekStart, currentMonth, previousMonth, targets]);

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
    return Array.from(allMonths).sort((a, b) => b.localeCompare(a)).map((monthKey) => ({
      monthKey,
      sales: salesMap.get(monthKey) ?? 0,
      prospects: prospectsMap.get(monthKey) ?? 0,
    }));
  }, [dseSales, dseProspects]);

  const maxMonthlySales = Math.max(...monthlyStats.map((m) => m.sales), 1);
  const bestMonth = useMemo(() => monthlyStats.length > 0 ? monthlyStats.reduce((best, curr) => (curr.sales > best.sales ? curr : best)) : null, [monthlyStats]);
  const worstMonth = useMemo(() => monthlyStats.length > 0 ? monthlyStats.reduce((worst, curr) => (curr.sales < worst.sales ? curr : worst)) : null, [monthlyStats]);

  const insights = useMemo(() => {
    const tips: string[] = [];
    if (stats.monthlyRemaining > 0) {
      const daysLeftInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
      if (daysLeftInMonth > 0) {
        const needed = Math.ceil(stats.monthlyRemaining / daysLeftInMonth);
        tips.push(`Need ${needed} sale${needed > 1 ? "s" : ""} per day to hit monthly target.`);
      }
    }
    if (stats.todaySales === 0) tips.push("No sales today — encourage field presence.");
    if (stats.conversionRate < 20 && stats.prospectsCount > 10) tips.push(`Conversion rate is ${stats.conversionRate}% — focus on quality follow-ups.`);
    else if (stats.conversionRate >= 40) tips.push(`Excellent conversion rate (${stats.conversionRate}%) — strong closing skills.`);
    if (stats.monthChange > 0) tips.push(`${stats.monthChange} more sales than last month — positive momentum!`);
    else if (stats.monthChange < 0) tips.push(`${Math.abs(stats.monthChange)} fewer sales than last month — needs motivation.`);
    if (stats.dailyRemaining === 0 && stats.todaySales > 0) tips.push(`Daily target met! Already ${stats.todaySales} sale${stats.todaySales > 1 ? "s" : ""} today.`);
    if (bestMonth && bestMonth.monthKey !== currentMonth) tips.push(`Best month was ${monthLabel(bestMonth.monthKey)} with ${bestMonth.sales} sales.`);
    return tips;
  }, [stats, bestMonth, currentMonth]);

  const selectedMonthSales = useMemo(() => dseSales.filter((s) => s.date.slice(0, 7) === selectedHistoryMonth), [dseSales, selectedHistoryMonth]);
  const historyMonths = useMemo(() => Array.from(new Set(dseSales.map((s) => s.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)), [dseSales]);

  const activeProspects = useMemo(() => dseProspects.filter((p) => p.status !== "SOLD" && p.status !== "LOST").sort((a, b) => a.expectedPurchaseDate.localeCompare(b.expectedPurchaseDate)), [dseProspects]);

  // Filter to today's activities for this DSE only
  const dseActivities = useMemo(() => activitiesData.activities
    .filter((a) => {
      const activityDate = a.time?.slice(0, 10);
      return activityDate === today && (
        a.detail?.toLowerCase().includes(dseName.toLowerCase()) ||
        a.title?.toLowerCase().includes(dseName.toLowerCase())
      );
    })
    .slice(0, 8), [activitiesData.activities, dseName, today]);

  if (!dseName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f23]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-500" />
      </div>
    );
  }

  const toggleSection = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  return (
    <div className="text-gray-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Back link */}
        <Link
          href="/developer/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-400 transition hover:text-purple-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Profile Header */}
        <div className="mb-6 rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ProfileAvatar
              name={dseName}
              avatarUrl={dseUserInfo?.avatarUrl?.startsWith("data:") ? dseUserInfo.avatarUrl : ""}
              size="xl"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-xl font-bold text-white sm:text-2xl">{dseName}</h1>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400 sm:justify-start">
                {dseUserInfo?.cugSuffix && <span className="inline-flex items-center gap-1"><Hash className="h-3.5 w-3.5" />CUG: {dseUserInfo.cugSuffix}</span>}
                {dseUserInfo?.region && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{dseUserInfo.region}</span>}
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-purple-300">DSE</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Full performance breakdown — sales, prospects, trends, and insights.</p>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KPICard label="Total Sales" value={String(stats.salesCount)} />
          <KPICard label="Prospects" value={String(stats.prospectsCount)} />
          <KPICard label="Conversion" value={`${stats.conversionRate}%`} />
          <KPICard label="Revenue" value={`K${stats.revenue.toLocaleString()}`} />
          <KPICard label="This Month" value={String(stats.monthSales)} />
          <KPICard label="Target" value={`${stats.monthlyProgress}%`} />
        </div>

        {/* Target Progress */}
        <div className="mb-6 rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Target Progress</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TargetCard label="Daily" current={stats.todaySales} target={targets.daily} progress={stats.dailyProgress} remaining={stats.dailyRemaining} />
            <TargetCard label="Weekly" current={stats.weekSales} target={targets.weekly} progress={stats.weeklyProgress} remaining={stats.weeklyRemaining} />
            <TargetCard label="Monthly" current={stats.monthSales} target={targets.monthly} progress={stats.monthlyProgress} remaining={stats.monthlyRemaining} />
          </div>
        </div>

        {/* Month-over-Month */}
        <div className="mb-6 rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Month-over-Month</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#252550] px-3 py-1 text-sm font-semibold">
              {stats.monthChange > 0 ? <ArrowUp className="h-4 w-4 text-emerald-400" /> : stats.monthChange < 0 ? <ArrowDown className="h-4 w-4 text-red-400" /> : null}
              <span className={stats.monthChange > 0 ? "text-emerald-400" : stats.monthChange < 0 ? "text-red-400" : "text-gray-400"}>
                {stats.monthChange > 0 ? "+" : ""}{stats.monthChange} ({stats.monthChangePercent > 0 ? "+" : ""}{stats.monthChangePercent}%)
              </span>
            </div>
          </div>
          <div className="flex items-end justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500">Previous ({shortMonth(previousMonth)})</p>
              <p className="text-2xl font-bold text-gray-400">{stats.prevMonthSales}</p>
              <div className="relative h-28 w-14 overflow-hidden rounded-xl bg-gray-700">
                <div className="absolute bottom-0 w-full rounded-xl bg-gray-500 transition-all" style={{ height: `${(stats.prevMonthSales / Math.max(stats.monthSales, stats.prevMonthSales, 1)) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500">Current ({shortMonth(currentMonth)})</p>
              <p className="text-2xl font-bold text-purple-400">{stats.monthSales}</p>
              <div className="relative h-28 w-14 overflow-hidden rounded-xl bg-gray-700">
                <div className="absolute bottom-0 w-full rounded-xl bg-purple-500 transition-all" style={{ height: `${(stats.monthSales / Math.max(stats.monthSales, stats.prevMonthSales, 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="mb-6 rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Monthly Performance</h2>
              <p className="text-xs text-gray-500">Sales & prospects per month</p>
            </div>
          </div>
          <div className="flex items-end gap-3 overflow-x-auto pb-2">
            {monthlyStats.map(({ monthKey, sales, prospects }) => (
              <div key={monthKey} className="flex shrink-0 flex-col items-center gap-2" title={`${monthLabel(monthKey)}: ${sales} sales`}>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-purple-400">{sales}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-gray-400">{prospects}</span>
                </div>
                <div className="relative flex h-32 w-10 items-end rounded-lg bg-gray-700">
                  <div className="absolute bottom-0 left-0 right-0 z-10 rounded-lg bg-purple-500 transition-all" style={{ height: `${(sales / maxMonthlySales) * 100}%` }} />
                  <div className="absolute bottom-0 left-0 right-0 z-20 rounded-lg bg-blue-400/30 transition-all" style={{ height: `${(prospects / Math.max(maxMonthlySales, 1)) * 100}%` }} />
                </div>
                <p className="text-[10px] font-medium text-gray-500">{shortMonth(monthKey)}</p>
              </div>
            ))}
            {monthlyStats.length === 0 && <p className="w-full py-8 text-center text-sm text-gray-500">No data yet.</p>}
          </div>
          {bestMonth && worstMonth && monthlyStats.length > 1 && (
            <div className="mt-4 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-yellow-500" />Best: {shortMonth(bestMonth.monthKey)} ({bestMonth.sales})</span>
              <span className="flex items-center gap-1"><ArrowDown className="h-3.5 w-3.5 text-red-400" />Lowest: {shortMonth(worstMonth.monthKey)} ({worstMonth.sales})</span>
            </div>
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-amber-200">Insights</h2>
            </div>
            <ul className="space-y-2">
              {insights.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-amber-300/80">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Active Prospects */}
        <div className="mb-6 rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-sm">
          <button type="button" onClick={() => toggleSection("prospects")} className="flex w-full items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Active Prospects</h2>
                <p className="text-xs text-gray-500">{activeProspects.length} active · {stats.monthProspects} this month</p>
              </div>
            </div>
            {expandedSection === "prospects" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
          {expandedSection === "prospects" && (
            <div className="border-t border-gray-700/50 px-5 pb-5">
              <div className="mt-4 space-y-3">
                {activeProspects.length > 0 ? activeProspects.map((prospect) => (
                  <div key={String(prospect._id)} className="rounded-xl border border-gray-700/50 bg-[#252550]/50 p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-white">{prospect.name}</h4>
                        <p className="mt-0.5 text-xs text-gray-400">{prospect.location}</p>
                        {prospect.notes?.trim() && <p className="mt-1.5 flex items-start gap-1 rounded-lg bg-amber-500/10 p-1.5 text-[10px] text-amber-300"><StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" /><span>{prospect.notes}</span></p>}
                      </div>
                      <StatusBadge status={prospect.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{prospect.expectedPurchaseDate}</span>
                    </div>
                  </div>
                )) : <p className="py-6 text-center text-sm text-gray-500">No active prospects.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Sales History */}
        <div className="mb-6 rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-sm">
          <button type="button" onClick={() => toggleSection("sales")} className="flex w-full items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-gray-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Sales History</h2>
                <p className="text-xs text-gray-500">{dseSales.length} total · K{stats.revenue.toLocaleString()} commission</p>
              </div>
            </div>
            {expandedSection === "sales" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
          {expandedSection === "sales" && (
            <div className="border-t border-gray-700/50 px-5 pb-5">
              {historyMonths.length > 0 && (
                <div className="mt-4 max-w-xs">
                  <select value={selectedHistoryMonth} onChange={(e) => setSelectedHistoryMonth(e.target.value)}
                    className="w-full rounded-xl border border-gray-600 bg-[#252550] px-4 py-2 text-sm text-gray-200 outline-none focus:border-purple-500">
                    {historyMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {selectedMonthSales.length > 0 ? selectedMonthSales.map((sale) => (
                  <div key={String(sale._id)} className="flex items-center justify-between rounded-xl border border-gray-700/50 bg-[#252550]/50 p-4">
                    <div>
                      <h4 className="font-semibold text-white">{sale.customer}</h4>
                      <p className="text-xs text-gray-400">ODU · {sale.date}</p>
                    </div>
                    <p className="font-bold text-emerald-400">K{COMMISSION_PER_SALE}</p>
                  </div>
                )) : <p className="py-6 text-center text-sm text-gray-500">No sales for this month.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-sm">
          <button type="button" onClick={() => toggleSection("activity")} className="flex w-full items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                <p className="text-xs text-gray-500">Latest field actions</p>
              </div>
            </div>
            {expandedSection === "activity" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
          {expandedSection === "activity" && (
            <div className="border-t border-gray-700/50 px-5 pb-5">
              <div className="mt-4">
                <ActivityTimeline activities={dseActivities.length > 0 ? dseActivities : activitiesData.activities.slice(0, 8)} compact />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-[#252550] p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function TargetCard({ label, current, target, progress, remaining }: { label: string; current: number; target: number; progress: number; remaining: number }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-[#252550] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label} Target</p>
      <p className="mt-2 text-2xl font-bold text-white">{current} <span className="text-sm font-normal text-gray-400">/ {target}</span></p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-700">
        <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">{remaining === 0 ? "✅ Target met!" : `${remaining} remaining`}</p>
    </div>
  );
}
