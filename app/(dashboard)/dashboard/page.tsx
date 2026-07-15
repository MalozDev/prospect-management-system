"use client";

import { ArrowRight, PhoneCall, PlusCircle, TrendingUp, Users2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { QuickActionButton } from "@/components/shared/QuickActionButton";
import { StatCard } from "@/components/shared/StatCard";
import { TodayProspects } from "@/components/shared/TodayProspects";
import { followUps, prospects, sales, type Prospect } from "@/lib/mock-data";

const TODAY_FALLBACK = "2026-07-15";

function getStoredProspects() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mockProspects");
    return raw ? (JSON.parse(raw) as Prospect[]) : [];
  } catch {
    return [];
  }
}

export default function DashboardPage() {
  const [todayProspects, setTodayProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = getStoredProspects();
    const allProspects = [...stored, ...prospects];
    const todayList = allProspects.filter((item) => [today, TODAY_FALLBACK].includes(item.expectedPurchaseDate));
    setTodayProspects(todayList.slice(0, 6));
  }, []);

  const todayFollowUps = followUps.filter((item) => item.status === "TODAY").length;
  const overdueFollowUps = followUps.filter((item) => item.status === "OVERDUE").length;
  const activeProspects = prospects.filter((item) => item.status !== "SOLD" && item.status !== "LOST").length;
  const salesThisMonth = sales.length;

  return (
    <PageShell title="Dashboard" description="Your priority prospects for today are listed first.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Follow Ups" value={String(todayFollowUps)} hint="Calls and visits" />
        <StatCard label="Overdue Follow Ups" value={String(overdueFollowUps)} hint="Action required" />
        <StatCard label="Active Prospects" value={String(activeProspects)} hint="Open leads" />
        <StatCard label="Sales This Month" value={String(salesThisMonth)} hint="Revenue" />
      </div>

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Prospects for Today</h2>
            <p className="text-sm text-gray-500">Tap a prospect to view contact options and next steps.</p>
          </div>
          <QuickActionButton icon={PlusCircle} label="New Prospect" href="/prospects/new" />
        </div>

        <div className="mt-6">
          <TodayProspects />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-500">Jump to the most important CRM tools.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#fff1f1] px-3 py-2 text-sm font-medium text-[#E60012]">
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <QuickActionButton icon={PhoneCall} label="View Follow Ups" href="/followups" />
          <QuickActionButton icon={TrendingUp} label="View Sales" href="/sales" />
          <QuickActionButton icon={Users2} label="Notifications" href="/notifications" />
        </div>
      </section>
    </PageShell>
  );
}