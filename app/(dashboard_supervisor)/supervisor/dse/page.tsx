"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  ShoppingCart,
  TrendingUp,
  Target,
  DollarSign,
  Phone,
  Calendar,
} from "lucide-react";

import { PageShell } from "@/components/shared/PageShell";
import { ProfileAvatar } from "@/components/shared/ProfileAvatar";
import { useApiData } from "@/lib/use-api-data";
import { useTargets } from "@/lib/use-targets";
import { COMMISSION_PER_SALE } from "@/lib/supervisor-utils";
import type { IProspect } from "@/lib/models/Prospect";
import type { ISale } from "@/lib/models/Sale";

interface DseUser {
  _id: string;
  name: string;
  cugSuffix: string;
  role: string;
  region: string;
  supervisor: string;
  avatarUrl: string;
  avatarColor: string;
}

export default function SupervisorDsePage() {
  const targets = useTargets();

  const { data: dseUsersData } = useApiData<{ dseUsers: DseUser[] }>("/api/supervisors/dse", { dseUsers: [] });
  const { data: prospectsData } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const { data: salesData } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);
  const weekStart = useMemo(() => {
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    return ws.toISOString().slice(0, 10);
  }, []);

  // Compute stats for each DSE
  const dseStats = useMemo(() => {
    return dseUsersData.dseUsers.map((dseUser) => {
      const dseProspects = prospectsData.prospects.filter((p) => p.assignedDse === dseUser.name);
      const dseSales = salesData.sales.filter((s) => s.soldBy === dseUser.name);

      const todaySales = dseSales.filter((s) => s.date === today).length;
      const weekSales = dseSales.filter((s) => s.date >= weekStart && s.date <= today).length;
      const monthSales = dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length;
      const todayProspects = dseProspects.filter((p) => p.createdAt === today).length;
      const totalProspects = dseProspects.length;
      const totalSales = dseSales.length;

      return {
        ...dseUser,
        totalProspects,
        totalSales,
        todaySales,
        weekSales,
        monthSales,
        todayProspects,
        dailyProgress: Math.min(100, Math.round((todaySales / targets.daily) * 100)),
        weeklyProgress: Math.min(100, Math.round((weekSales / targets.weekly) * 100)),
        monthlyProgress: Math.min(100, Math.round((monthSales / targets.monthly) * 100)),
        dailyRemaining: Math.max(0, targets.daily - todaySales),
        weeklyRemaining: Math.max(0, targets.weekly - weekSales),
        monthlyRemaining: Math.max(0, targets.monthly - monthSales),
        revenue: totalSales * COMMISSION_PER_SALE,
        conversionRate: totalProspects > 0 ? Math.round((totalSales / totalProspects) * 100) : 0,
      };
    }).sort((a, b) => b.monthSales - a.monthSales || b.todaySales - a.todaySales);
  }, [dseUsersData.dseUsers, prospectsData.prospects, salesData.sales, today, weekStart, currentMonth, targets]);

  // Overall stats
  const totals = useMemo(() => ({
    total: dseStats.length,
    active: dseStats.filter((d) => d.todaySales > 0 || d.todayProspects > 0).length,
    totalMonthSales: dseStats.reduce((sum, d) => sum + d.monthSales, 0),
    totalMonthRevenue: dseStats.reduce((sum, d) => sum + d.revenue, 0),
  }), [dseStats]);

  return (
    <PageShell title="DSE on Board" description="View all your DSE team members, their profiles, and performance stats.">
      {/* ── Stats Bar ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Total DSE</p>
          </div>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{totals.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Active Today</p>
          </div>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{totals.active}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Month Sales</p>
          </div>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{totals.totalMonthSales}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">Commission</p>
          </div>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">K{totals.totalMonthRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* ── DSE Cards ── */}
      <div className="space-y-3">
        {dseStats.length > 0 ? (
          dseStats.map((dse) => (
            <Link
              key={dse._id}
              href={`/supervisor/dse/${encodeURIComponent(dse.name)}`}
              className="block rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#E60012]/30 hover:shadow-md sm:p-5"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <ProfileAvatar
                  name={dse.name}
                  avatarUrl={dse.avatarUrl}
                  avatarColor={dse.avatarColor}
                  size="lg"
                  showName
                  namePosition="below"
                />

                {/* Stats */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{dse.name}</h3>
                      <p className="text-xs text-gray-500">
                        CUG: {dse.cugSuffix} · {dse.region}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#E60012]">
                      Analysis <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>

                  {/* KPI row */}
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-center">
                      <p className="text-[9px] font-semibold uppercase text-gray-500">Prospects</p>
                      <p className="mt-0.5 text-sm font-bold text-gray-900">{dse.totalProspects}</p>
                      <p className="text-[9px] text-[#E60012]">+{dse.todayProspects} today</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-center">
                      <p className="text-[9px] font-semibold uppercase text-gray-500">Sales</p>
                      <p className="mt-0.5 text-sm font-bold text-gray-900">{dse.totalSales}</p>
                      <p className="text-[9px] text-gray-500">{dse.monthSales} this month</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-center">
                      <p className="text-[9px] font-semibold uppercase text-gray-500">Conversion</p>
                      <p className="mt-0.5 text-sm font-bold text-gray-900">{dse.conversionRate}%</p>
                      <p className="text-[9px] text-gray-500">K{dse.revenue.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Target bars */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <TargetProgress label="Daily" current={dse.todaySales} remaining={dse.dailyRemaining} progress={dse.dailyProgress} />
                    <TargetProgress label="Weekly" current={dse.weekSales} remaining={dse.weeklyRemaining} progress={dse.weeklyProgress} />
                    <TargetProgress label="Monthly" current={dse.monthSales} remaining={dse.monthlyRemaining} progress={dse.monthlyProgress} />
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-500">No DSE team members found.</p>
            <p className="mt-1 text-xs text-gray-400">DSEs assigned to you will appear here once they are created and linked to your name.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function TargetProgress({ label, current, remaining, progress }: { label: string; current: number; remaining: number; progress: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-center">
      <p className="text-[9px] font-semibold uppercase text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{current}</p>
      <div className="mx-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-[#E60012]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-0.5 text-[9px] text-gray-500">{remaining > 0 ? `${remaining} left` : "✅ Done"}</p>
    </div>
  );
}
