"use client";

import Link from "next/link";
import { BellRing, CalendarDays, PhoneCall, PlusCircle, Target, TrendingUp, StickyNote, Clock, CheckCircle2, Users, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

import { PageShell } from "@/components/shared/PageShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { useApiData } from "@/lib/use-api-data";
import { useTargets } from "@/lib/use-targets";
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import { getStoredProfile } from "@/utils/profile";
import type { IProspect } from "@/lib/models/Prospect";
import type { ISale } from "@/lib/models/Sale";
import type { IFollowUp } from "@/lib/models/FollowUp";
import type { IActivity } from "@/lib/models/Activity";

export default function DashboardPage() {
  const targets = useTargets();
  const { data: prospectsData } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const { data: salesData } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const { data: followUpsData } = useApiData<{ followUps: IFollowUp[] }>("/api/followups", { followUps: [] });
  const { data: activitiesData } = useApiData<{ activities: IActivity[] }>("/api/activities?limit=10", { activities: [] });
  const dseName = useMemo(() => getStoredProfile().name, []);
  const [showActivities, setShowActivities] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter activities to only today's
  const todayActivities = useMemo(
    () => activitiesData.activities.filter((a) => {
      const activityDate = a.time?.slice(0, 10);
      return activityDate === today;
    }),
    [activitiesData.activities, today]
  );
  const currentMonth = today.slice(0, 7);
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // ── Today's stats ──
  const prospectsCreatedToday = useMemo(
    () => prospectsData.prospects.filter((p) => p.createdAt === today),
    [prospectsData.prospects, today]
  );

  const prospectsDueToday = useMemo(
    () => prospectsData.prospects.filter((p) => p.expectedPurchaseDate === today && p.status !== "SOLD" && p.status !== "LOST"),
    [prospectsData.prospects, today]
  );

  const soldToday = useMemo(
    () => salesData.sales.filter((s) => s.date === today).length,
    [salesData.sales, today]
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

  const targetProgress = Math.min(100, Math.round((salesThisMonth / targets.monthly) * 100));
  const prospectTargetProgress = targets.prospectDaily > 0
    ? Math.min(100, Math.round((prospectsCreatedToday.length / targets.prospectDaily) * 100))
    : 0;

  // Dynamic insights based on actual performance
  const insight = useMemo(() => {
    const dailyRemaining = Math.max(0, targets.daily - salesToday);
    const weeklyRemaining = Math.max(0, targets.weekly - salesThisWeek);
    const monthlyRemaining = Math.max(0, targets.monthly - salesThisMonth);

    if (salesToday >= targets.daily) {
      return { text: `Daily target met! ${salesToday} sold today.`, color: "text-emerald-600" };
    }
    if (salesToday === 1) {
      return { text: `1 sale today — ${dailyRemaining} more to hit daily target of ${targets.daily}.`, color: "text-amber-600" };
    }
    if (salesToday === 0 && salesThisWeek > 0) {
      return { text: `${salesThisWeek} sales this week — push for ${dailyRemaining > 0 ? `${dailyRemaining} more today` : "more"}.`, color: "text-gray-600" };
    }
    if (salesThisMonth === 0) {
      return { text: "No sales yet this month — let's get started!", color: "text-gray-500" };
    }
    if (weeklyRemaining <= 3 && salesThisWeek > 0) {
      return { text: `Only ${weeklyRemaining} away from weekly target of ${targets.weekly}!`, color: "text-emerald-600" };
    }
    if (monthlyRemaining > 0) {
      return { text: `${salesThisMonth} of ${targets.monthly} this month — ${monthlyRemaining} remaining.`, color: "text-gray-600" };
    }
    return { text: `${salesThisMonth} of ${targets.monthly} this month. Keep going!`, color: "text-gray-600" };
  }, [salesToday, salesThisWeek, salesThisMonth, targets]);

  const getRingColor = (amount: number) => {
    const pct = targets.monthly > 0 ? (amount / targets.monthly) * 100 : 0;
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
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">Prospects: {prospectsCreatedToday.length}/{targets.prospectDaily}</span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">Sales: {salesToday}/{targets.daily}</span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">Week: {salesThisWeek}/{targets.weekly}</span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">Month: {salesThisMonth}/{targets.monthly}</span>
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

      {/* ── Today's Summary Stats ── */}
      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-[#E60012]">
            <Users className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Created</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{prospectsCreatedToday.length}</p>
          <p className="mt-0.5 text-[10px] text-gray-500">today</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-[#E60012]">
            <Clock className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Due now</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{prospectsDueToday.length}</p>
          <p className="mt-0.5 text-[10px] text-gray-500">active follow-ups</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sold</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{soldToday}</p>
          <p className="mt-0.5 text-[10px] text-gray-500">today</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Overdue</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{overdueFollowUps}</p>
          <p className="mt-0.5 text-[10px] text-gray-500">follow-ups</p>
        </div>
      </section>

      {/* ── Follow-ups Due Today ── */}
      {prospectsDueToday.length > 0 && (
        <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Follow-ups due today</h2>
              <p className="text-xs text-gray-500">Contact these prospects now.</p>
            </div>
            <Link href="/followups" className="text-sm font-medium text-[#E60012]">
              View all
            </Link>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {prospectsDueToday.slice(0, 6).map((prospect) => (
              <Link href="/followups" key={String(prospect._id)} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{prospect.name}</p>
                <p className="mt-1 text-xs text-gray-500">{prospect.location}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-[#E60012]">
                  <PhoneCall className="h-3.5 w-3.5" /> {prospect.phone}
                </p>
                {prospect.notes?.trim() && (
                  <p className="mt-1.5 flex items-start gap-1 rounded-lg bg-amber-50 p-1.5 text-[10px] text-amber-800">
                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    <span>{prospect.notes}</span>
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <a
                    href={`tel:${prospect.phone}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-[#E60012] transition hover:bg-red-50"
                    aria-label={`Call ${prospect.name}`}
                  >
                    <PhoneCall className="h-3 w-3" /> Call
                  </a>
                  <a
                    href={buildWhatsAppUrl(prospect.phone, buildWhatsAppMessage({ customerName: prospect.name, dseName, title: prospect.title, location: prospect.location, notes: prospect.notes }))}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-green-600 transition hover:bg-green-50"
                    aria-label={`WhatsApp ${prospect.name}`}
                  >
                    <FaWhatsapp className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Today's Activity (collapsible dropdown) ── */}
      <section className="mt-4 rounded-3xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowActivities((v) => !v)}
          className="flex w-full items-center justify-between p-3 text-left"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Today&apos;s activity</h2>
            <p className="text-xs text-gray-500">
              {todayActivities.length} action{todayActivities.length !== 1 ? "s" : ""} today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#E60012]">
              {showActivities ? "Hide" : "View"}
            </span>
            {showActivities ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {showActivities && (
          <div className="border-t border-gray-100 p-3">
            {todayActivities.length > 0 ? (
              <ActivityTimeline activities={todayActivities} filterable />
            ) : prospectsCreatedToday.length > 0 ? (
              <div className="space-y-2">
                {prospectsCreatedToday.map((prospect) => (
                  <div key={String(prospect._id)} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{prospect.name}</p>
                        <StatusBadge status={prospect.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {prospect.location} · Follow-up: {prospect.expectedPurchaseDate}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">Added today</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5 pl-2">
                      <a
                        href={`tel:${prospect.phone}`}
                        className="rounded-full border border-gray-200 bg-white p-1.5 text-[#E60012] transition hover:bg-red-50"
                        aria-label={`Call ${prospect.name}`}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={buildWhatsAppUrl(prospect.phone, buildWhatsAppMessage({ customerName: prospect.name, dseName, title: prospect.title, location: prospect.location, notes: prospect.notes }))}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-gray-200 bg-white p-1.5 text-green-600 transition hover:bg-green-50"
                        aria-label={`WhatsApp ${prospect.name}`}
                      >
                        <FaWhatsapp className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                No activity today yet. Capture your first prospect!
              </div>
            )}
          </div>
        )}
      </section>
    </PageShell>
  );
}
