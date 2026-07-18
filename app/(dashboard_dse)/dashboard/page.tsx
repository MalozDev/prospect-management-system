"use client";

import Link from "next/link";
import { BellRing, CalendarDays, PhoneCall, PlusCircle, Target, TrendingUp } from "lucide-react";
import { useMemo } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { useApiData } from "@/lib/use-api-data";
import { DAILY_SALES_TARGET, WEEKLY_SALES_TARGET, MONTHLY_SALES_TARGET } from "@/lib/supervisor-utils";
import type { IProspect } from "@/lib/models/Prospect";
import type { ISale } from "@/lib/models/Sale";
import type { IFollowUp } from "@/lib/models/FollowUp";

export default function DashboardPage() {
  const { data: prospectsData } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const { data: salesData } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const { data: followUpsData } = useApiData<{ followUps: IFollowUp[] }>("/api/followups", { followUps: [] });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);
  const weekStart = useMemo(() => {
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    return ws.toISOString().slice(0, 10);
  }, []);

  const todayProspects = useMemo(
    () => prospectsData.prospects.filter((p) => p.expectedPurchaseDate === today).slice(0, 6),
    [prospectsData.prospects, today]
  );

  const todayFollowUps = useMemo(
    () => followUpsData.followUps.filter((item) => item.status === "TODAY").length,
    [followUpsData.followUps]
  );

  const overdueFollowUps = useMemo(
    () => followUpsData.followUps.filter((item) => item.status === "OVERDUE").length,
    [followUpsData.followUps]
  );

  // Sales stats
  const salesToday = useMemo(
    () => salesData.sales.filter((s) => s.date === today).length,
    [salesData.sales, today]
  );
  const salesThisWeek = useMemo(
    () => salesData.sales.filter((s) => s.date >= weekStart && s.date <= today).length,
    [salesData.sales, weekStart, today]
  );
  const salesThisMonth = useMemo(
    () => salesData.sales.filter((s) => s.date.slice(0, 7) === currentMonth).length,
    [salesData.sales, currentMonth]
  );

  const targetProgress = Math.min(100, Math.round((salesThisMonth / MONTHLY_SALES_TARGET) * 100));

  // Dynamic insights based on actual performance
  const insight = useMemo(() => {
    const dailyRemaining = Math.max(0, DAILY_SALES_TARGET - salesToday);
    const weeklyRemaining = Math.max(0, WEEKLY_SALES_TARGET - salesThisWeek);
    const monthlyRemaining = Math.max(0, MONTHLY_SALES_TARGET - salesThisMonth);

    if (salesToday >= DAILY_SALES_TARGET) {
      return { text: `Daily target met! ${salesToday} sold today.`, color: "text-emerald-600" };
    }
    if (salesToday === 1) {
      return { text: `1 sale today — ${dailyRemaining} more to hit daily target of ${DAILY_SALES_TARGET}.`, color: "text-amber-600" };
    }
    if (salesToday === 0 && salesThisWeek > 0) {
      return { text: `${salesThisWeek} sales this week — push for ${dailyRemaining > 0 ? `${dailyRemaining} more today` : "more"}.`, color: "text-gray-600" };
    }
    if (salesThisMonth === 0) {
      return { text: "No sales yet this month — let's get started!", color: "text-gray-500" };
    }
    if (weeklyRemaining <= 3 && salesThisWeek > 0) {
      return { text: `Only ${weeklyRemaining} away from weekly target of ${WEEKLY_SALES_TARGET}!`, color: "text-emerald-600" };
    }
    if (monthlyRemaining > 0) {
      return { text: `${salesThisMonth} of ${MONTHLY_SALES_TARGET} this month — ${monthlyRemaining} remaining.`, color: "text-gray-600" };
    }
    return { text: `${salesThisMonth} of ${MONTHLY_SALES_TARGET} this month. Keep going!`, color: "text-gray-600" };
  }, [salesToday, salesThisWeek, salesThisMonth]);

  const getRingColor = (amount: number) => {
    const pct = MONTHLY_SALES_TARGET > 0 ? (amount / MONTHLY_SALES_TARGET) * 100 : 0;
    if (pct >= 75) return "#16a34a";
    if (pct >= 50) return "#fb923c";
    if (pct >= 25) return "#facc15";
    return "#dc2626";
  };
  const ringStyle = {
    background: `conic-gradient(${getRingColor(salesThisMonth)} 0% ${targetProgress}%, #f3f4f6 ${targetProgress}% 100%)`,
  };

  return (
    <PageShell title="Dashboard" description="Your priorities for today are right here.">
      <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex items-center gap-3 rounded-2xl bg-[#fff7f7] p-3">
            <div className="relative h-16 w-16 shrink-0" style={ringStyle}>
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white text-[10px] font-semibold text-gray-700">
                {targetProgress}%
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#E60012]" />
                <p className="text-sm font-semibold text-gray-900">Monthly target</p>
              </div>
              <p className={`mt-1 text-xs font-medium ${insight.color}`}>{insight.text}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">Today: {salesToday}/{DAILY_SALES_TARGET}</span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">Week: {salesThisWeek}/{WEEKLY_SALES_TARGET}</span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">Month: {salesThisMonth}/{MONTHLY_SALES_TARGET}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/prospects/new" className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
              <PlusCircle className="mb-1 h-4 w-4 text-[#E60012]" />
              New Prospect
            </Link>
            <Link href="/followups" className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
              <CalendarDays className="mb-1 h-4 w-4 text-[#E60012]" />
              Follow-ups
            </Link>
            <Link href="/sales" className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
              <TrendingUp className="mb-1 h-4 w-4 text-[#E60012]" />
              Sales
            </Link>
            <Link href="/notifications" className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
              <BellRing className="mb-1 h-4 w-4 text-[#E60012]" />
              Alerts
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Today&apos;s prospects</h2>
            <p className="text-xs text-gray-500">Quick calls and visits.</p>
          </div>
          <Link href="/followups" className="text-sm font-medium text-[#E60012]">
            View all
          </Link>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {todayProspects.length > 0 ? (
            todayProspects.map((prospect) => (
              <Link href="/followups" key={String(prospect._id)} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{prospect.name}</p>
                <p className="mt-1 text-xs text-gray-500">{prospect.location}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-[#E60012]">
                  <PhoneCall className="h-3.5 w-3.5" /> {prospect.phone}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 sm:col-span-3">
              No prospects scheduled for today yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Today follow-ups</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{todayFollowUps}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{overdueFollowUps}</p>
        </div>
      </section>
    </PageShell>
  );
}
