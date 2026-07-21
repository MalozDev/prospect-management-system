"use client";

import {
  Users,
  UserPlus,
  Target,
  ShoppingCart,
  TrendingUp,
  Activity,
  Shield,
  Settings,
  ChevronDown,
  ChevronRight,
  Users2,
  Clock,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  X,
  LogIn,
  MapPin,
  Phone,
  Award,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";

import { useApiData } from "@/lib/use-api-data";
import { getTodayLocal } from "@/lib/time-utils";
import type { IUser } from "@/lib/models/User";
import type { IProspect } from "@/lib/models/Prospect";
import type { ISale } from "@/lib/models/Sale";
import type { IFollowUp } from "@/lib/models/FollowUp";

interface DseStats {
  prospectsToday: number;
  prospectsMonth: number;
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
}

interface DseMember {
  name: string;
  cugSuffix: string;
  region: string;
  lastLogin: string;
  activeToday: boolean;
  stats: DseStats;
}

interface TeamStats {
  totalDse: number;
  totalProspects: number;
  prospectsToday: number;
  prospectsMonth: number;
  totalSales: number;
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  activeToday: number;
}

interface SupervisorTeam {
  supervisor: { name: string; cugSuffix: string; region: string };
  stats: TeamStats;
  dseMembers: DseMember[];
}

const FALLBACK_UNASSIGNED = {
  supervisor: { name: "Unassigned", cugSuffix: "", region: "" },
  stats: { totalDse: 0, totalProspects: 0, prospectsToday: 0, prospectsMonth: 0, totalSales: 0, salesToday: 0, salesWeek: 0, salesMonth: 0, activeToday: 0 },
  dseMembers: [] as DseMember[],
};

export default function DeveloperDashboardPage() {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const currentMonth = today.slice(0, 7);

  const { data: usersData, loading: loadingUsers } = useApiData<{ users: IUser[] }>("/api/users", { users: [] });
  const { data: prospectsData, loading: loadingProspects } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const { data: salesData, loading: loadingSales } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const { data: followUpsData, loading: loadingFollowUps } = useApiData<{ followUps: IFollowUp[] }>("/api/followups", { followUps: [] });
  const { data: groupedData, loading: loadingGrouped } = useApiData<{ teams: SupervisorTeam[]; unassigned: SupervisorTeam }>(
    "/api/supervisors/grouped",
    { teams: [], unassigned: FALLBACK_UNASSIGNED }
  );

  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [showActiveUsers, setShowActiveUsers] = useState(false);

  const toggleTeam = (name: string) => {
    setExpandedTeams((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Close modal on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowActiveUsers(false);
    };
    if (showActiveUsers) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [showActiveUsers]);

  const stats = useMemo(() => {
    const users = usersData.users;
    const prospects = prospectsData.prospects;
    const sales = salesData.sales;
    const followUps = followUpsData.followUps;

    // Collect all active DSEs from grouped data
    const activeDses: { name: string; region: string; cugSuffix: string; lastLogin: string; supervisor: string; stats: DseStats }[] = [];
    for (const team of groupedData.teams) {
      for (const dse of team.dseMembers) {
        if (dse.activeToday) {
          activeDses.push({ ...dse, supervisor: team.supervisor.name });
        }
      }
    }
    for (const dse of groupedData.unassigned.dseMembers) {
      if (dse.activeToday) {
        activeDses.push({ ...dse, supervisor: "Unassigned" });
      }
    }

    // Active supervisors from users data
    const activeSupervisors = users.filter((u) => u.role === "SUPERVISOR" && u.lastLogin?.startsWith(today)).map((u) => ({
      name: u.name,
      region: u.region,
      cugSuffix: u.cugSuffix,
      lastLogin: u.lastLogin || "",
    }));

    let activeToday = activeDses.length + activeSupervisors.length;

    return {
      totalDse: users.filter((u) => u.role === "DSE").length,
      totalSupervisors: users.filter((u) => u.role === "SUPERVISOR").length,
      totalUsers: users.length,
      totalProspects: prospects.length,
      prospectsToday: prospects.filter((p) => p.createdAt === today).length,
      prospectsMonth: prospects.filter((p) => p.createdAt?.slice(0, 7) === currentMonth).length,
      totalSales: sales.length,
      salesToday: sales.filter((s) => s.date === today).length,
      salesMonth: sales.filter((s) => s.date.slice(0, 7) === currentMonth).length,
      totalFollowUps: followUps.length,
      openFollowUps: followUps.filter((f) => f.status === "TODAY" || f.status === "OVERDUE").length,
      activeToday,
      activeDses,
      activeSupervisors,
    };
  }, [usersData, prospectsData, salesData, followUpsData, groupedData, today, currentMonth]);

  const isLoading = loadingUsers || loadingProspects || loadingSales || loadingFollowUps;

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      subtitle: `${stats.totalDse} DSE · ${stats.totalSupervisors} Sup.`,
      icon: Users,
      gradient: "from-purple-600 to-blue-600",
    },
    {
      title: "Prospects",
      value: stats.totalProspects,
      subtitle: `${stats.prospectsToday} today · ${stats.prospectsMonth} this month`,
      icon: Target,
      gradient: "from-blue-600 to-cyan-600",
    },
    {
      title: "Sales",
      value: stats.totalSales,
      subtitle: `${stats.salesToday} today · ${stats.salesMonth} this month`,
      icon: ShoppingCart,
      gradient: "from-emerald-600 to-teal-600",
    },
    {
      title: "Active Today",
      value: stats.activeToday,
      subtitle: `${stats.totalDse > 0 ? Math.round((stats.activeToday / stats.totalDse) * 100) : 0}% of DSEs active`,
      icon: Zap,
      gradient: "from-orange-600 to-pink-600",
      onClick: stats.activeToday > 0 ? () => setShowActiveUsers(true) : undefined,
    },
  ];

  // Compute top performer
  const topPerformer = useMemo(() => {
    let best: { name: string; sales: number } | null = null;
    for (const team of groupedData.teams) {
      for (const dse of team.dseMembers) {
        if (!best || dse.stats.salesMonth > best.sales) {
          best = { name: dse.name, sales: dse.stats.salesMonth };
        }
      }
    }
    return best;
  }, [groupedData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">System Overview</h2>
          <p className="mt-1 text-sm text-gray-400">
            Full visibility into your CRM platform at a glance.
          </p>
        </div>
        {/* Pulse indicator */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-emerald-300">Live</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-500" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.title}
                onClick={card.onClick}
                className={`group relative overflow-hidden rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5 transition hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 ${card.onClick ? 'cursor-pointer' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.03]`} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {card.title}
                    </span>
                    <card.icon className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Spotlight: Top Performer & Activity Pulse */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Top Performer */}
            <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-[#1a1a3e] to-[#252550] p-5 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Top Performer</h3>
              </div>
              {topPerformer ? (
                <div>
                  <div className="flex items-center gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 text-lg font-bold text-yellow-400">
                      {topPerformer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{topPerformer.name}</p>
                      <p className="text-sm text-yellow-400">{topPerformer.sales} sales this month</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No sales data yet.</p>
              )}
            </div>

            {/* User Breakdown */}
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">User Breakdown</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-[#252550] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                    <UserPlus className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Direct Sales Executives</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-700">
                        <div
                          className="h-1.5 rounded-full bg-purple-500"
                          style={{ width: `${stats.totalUsers > 0 ? (stats.totalDse / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{stats.totalDse}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-[#252550] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Supervisors</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-700">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${stats.totalUsers > 0 ? (stats.totalSupervisors / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{stats.totalSupervisors}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Pulse */}
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Today&apos;s Pulse</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#252550] p-3 text-center">
                  <Clock className="mx-auto h-5 w-5 text-emerald-400" />
                  <p className="mt-1 text-2xl font-bold text-white">{stats.activeToday}</p>
                  <p className="text-[10px] text-gray-400">Active Now</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3 text-center">
                  <BarChart3 className="mx-auto h-5 w-5 text-blue-400" />
                  <p className="mt-1 text-2xl font-bold text-white">{stats.prospectsToday}</p>
                  <p className="text-[10px] text-gray-400">Prosp. Today</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3 text-center">
                  <ShoppingCart className="mx-auto h-5 w-5 text-emerald-400" />
                  <p className="mt-1 text-2xl font-bold text-white">{stats.salesToday}</p>
                  <p className="text-[10px] text-gray-400">Sales Today</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3 text-center">
                  <Activity className="mx-auto h-5 w-5 text-orange-400" />
                  <p className="mt-1 text-2xl font-bold text-white">{stats.openFollowUps}</p>
                  <p className="text-[10px] text-gray-400">Open F/Up</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Quick Links</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/developer/users"
                className="inline-flex items-center gap-2 rounded-xl bg-[#252550] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-purple-600/20 hover:text-purple-400"
              >
                <Users className="h-4 w-4" />
                Manage Users
              </a>
              <a
                href="/developer/settings"
                className="inline-flex items-center gap-2 rounded-xl bg-[#252550] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-purple-600/20 hover:text-purple-400"
              >
                <Settings className="h-4 w-4" />
                System Settings
              </a>
            </div>
          </div>
        </>
      )}

      {/* Supervisor Teams Section */}
      <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users2 className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Teams by Supervisor</h3>
          <span className="ml-auto text-xs text-gray-500">
            {groupedData.teams.length} supervisor{groupedData.teams.length !== 1 ? "s" : ""}
            {groupedData.unassigned.stats.totalDse > 0 && ` · ${groupedData.unassigned.stats.totalDse} unassigned`}
          </span>
        </div>

        {loadingGrouped ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-purple-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Unassigned DSEs section */}
            {groupedData.unassigned.stats.totalDse > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5">
                <button
                  type="button"
                  onClick={() => toggleTeam("__unassigned__")}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                    <Users className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-300">Unassigned DSEs</p>
                    <p className="text-xs text-gray-400">
                      {groupedData.unassigned.stats.totalDse} DSE{groupedData.unassigned.stats.totalDse !== 1 ? "s" : ""}
                      · {groupedData.unassigned.stats.prospectsMonth} prospects · {groupedData.unassigned.stats.salesMonth} sales
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-400">{groupedData.unassigned.stats.salesToday} today</span>
                    {expandedTeams["__unassigned__"] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
                {expandedTeams["__unassigned__"] && (
                  <div className="border-t border-amber-500/20 px-3 pb-3 pt-2">
                    {groupedData.unassigned.dseMembers.map((dse) => (
                      <DseRow key={dse.name} dse={dse} teamColor="amber" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Supervisors with teams */}
            {groupedData.teams.length === 0 && groupedData.unassigned.stats.totalDse === 0 ? (
              <div className="rounded-xl bg-[#252550] p-6 text-center">
                <Users2 className="mx-auto h-10 w-10 text-gray-600" />
                <p className="mt-2 text-sm text-gray-500">No teams or DSEs registered yet.</p>
              </div>
            ) : (
              groupedData.teams.map((team) => (
                <div key={team.supervisor.name} className="rounded-xl border border-gray-700/50 bg-[#252550]/50">
                  <button
                    type="button"
                    onClick={() => toggleTeam(team.supervisor.name)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{team.supervisor.name}</p>
                      <p className="text-xs text-gray-400">
                        {team.stats.totalDse} DSE{team.stats.totalDse !== 1 ? "s" : ""}
                        · {team.stats.prospectsMonth} prospects · {team.stats.salesMonth} sales
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Active today indicator */}
                      {(team.stats.activeToday ?? 0) > 0 && (
                        <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-emerald-400">{team.stats.activeToday}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-400">{team.stats.salesToday}</p>
                        <p className="text-[9px] text-gray-500">today</p>
                      </div>
                      {expandedTeams[team.supervisor.name] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedTeams[team.supervisor.name] && (
                    <div className="border-t border-gray-700/50 px-3 pb-3 pt-2">
                      {/* Team stats mini-grid */}
                      <div className="mb-3 grid grid-cols-4 gap-2">
                        <div className="rounded-lg bg-[#1a1a3e] p-2 text-center">
                          <p className="text-lg font-bold text-white">{team.stats.prospectsToday}</p>
                          <p className="text-[10px] text-gray-400">Prosp. Today</p>
                        </div>
                        <div className="rounded-lg bg-[#1a1a3e] p-2 text-center">
                          <p className="text-lg font-bold text-white">{team.stats.prospectsMonth}</p>
                          <p className="text-[10px] text-gray-400">Prosp. Month</p>
                        </div>
                        <div className="rounded-lg bg-[#1a1a3e] p-2 text-center">
                          <p className="text-lg font-bold text-white">{team.stats.salesWeek}</p>
                          <p className="text-[10px] text-gray-400">Sales Week</p>
                        </div>
                        <div className="rounded-lg bg-[#1a1a3e] p-2 text-center">
                          <p className="text-lg font-bold text-white">{team.stats.salesMonth}</p>
                          <p className="text-[10px] text-gray-400">Sales Month</p>
                        </div>
                      </div>

                      {/* DSE members with performance stats */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Team Members</p>
                        {team.dseMembers.map((dse) => (
                          <DseRow key={dse.name} dse={dse} teamColor="purple" />
                        ))}
                        {team.dseMembers.length === 0 && (
                          <p className="py-2 text-xs italic text-gray-500">No DSEs assigned yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Active Users Modal ── */}
      {showActiveUsers && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto pt-4 pb-8 sm:pt-10">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowActiveUsers(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-2xl shadow-purple-500/10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Active Today</h2>
                <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-medium text-orange-300">
                  {stats.activeToday} user{stats.activeToday !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveUsers(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 transition hover:bg-gray-600 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
              {/* Active DSEs */}
              {stats.activeDses.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">
                      Direct Sales Executives
                    </h3>
                    <span className="ml-auto text-xs text-gray-500">{stats.activeDses.length} active</span>
                  </div>
                  <div className="space-y-2">
                    {stats.activeDses.map((dse) => {
                      const loginTime = dse.lastLogin ? new Date(dse.lastLogin).toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
                      return (
                        <Link
                          key={dse.name}
                          href={`/developer/dse/${encodeURIComponent(dse.name)}`}
                          className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 transition hover:bg-emerald-500/10"
                        >
                          {/* Avatar */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                            {dse.name.charAt(0)}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{dse.name}</span>
                              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                                DSE
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5" />{dse.region}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />CUG: {dse.cugSuffix}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <LogIn className="h-2.5 w-2.5" />{loginTime}
                              </span>
                              <span className="text-gray-500">· Sup: {dse.supervisor}</span>
                            </div>
                          </div>

                          {/* Mini stats */}
                          <div className="flex shrink-0 items-center gap-2.5 text-xs">
                            <div className="text-center">
                              <p className={`font-semibold ${dse.stats.prospectsToday > 0 ? "text-blue-400" : "text-gray-500"}`}>{dse.stats.prospectsToday}</p>
                              <p className="text-[9px] text-gray-600">Prosp.</p>
                            </div>
                            <div className="text-center">
                              <p className={`font-semibold ${dse.stats.salesToday > 0 ? "text-emerald-400" : "text-gray-500"}`}>{dse.stats.salesToday}</p>
                              <p className="text-[9px] text-gray-600">Sold</p>
                            </div>
                            <ArrowUpRight className="h-3 w-3 text-gray-500" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Active Supervisors */}
              {stats.activeSupervisors && stats.activeSupervisors.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">
                      Supervisors
                    </h3>
                    <span className="ml-auto text-xs text-gray-500">{stats.activeSupervisors.length} active</span>
                  </div>
                  <div className="space-y-2">
                    {stats.activeSupervisors.map((sup: { name: string; region: string; cugSuffix: string; lastLogin: string }) => {
                      const loginTime = sup.lastLogin ? new Date(sup.lastLogin).toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
                      return (
                        <div
                          key={sup.name}
                          className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400">
                            {sup.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{sup.name}</span>
                              <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">
                                Supervisor
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5" />{sup.region}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />CUG: {sup.cugSuffix}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <LogIn className="h-2.5 w-2.5" />{loginTime}
                              </span>
                            </div>
                          </div>
                          <Award className="h-4 w-4 shrink-0 text-blue-400" />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {stats.activeDses.length === 0 && (!stats.activeSupervisors || stats.activeSupervisors.length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Zap className="h-12 w-12 text-gray-600" />
                  <p className="mt-3 text-sm text-gray-400">No active users today yet.</p>
                  <p className="text-xs text-gray-500">Activity data will appear once users log in.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Individual DSE row with performance stats + active indicator */
function DseRow({ dse, teamColor }: { dse: DseMember; teamColor: "purple" | "amber" }) {
  const colorClasses = teamColor === "purple"
    ? { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/10" }
    : { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/10" };

  return (
    <Link
      href={`/developer/dse/${encodeURIComponent(dse.name)}`}
      className={`flex items-center gap-2 rounded-lg bg-[#1a1a3e] px-3 py-2 transition hover:bg-[#252550] ${dse.activeToday ? "border-l-2 border-emerald-500" : ""}`}
    >
      {/* Avatar */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClasses.bg} text-xs font-bold ${colorClasses.text}`}>
        {dse.name.charAt(0)}
      </div>

      {/* Name + region */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-200">{dse.name}</span>
          {dse.activeToday && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Active today" />
          )}
        </div>
        <p className="text-[10px] text-gray-500">{dse.region} · CUG: {dse.cugSuffix}</p>
      </div>

      {/* Mini stats */}
      <div className="flex shrink-0 items-center gap-3 text-xs">
        <div className="text-center">
          <p className={`font-semibold ${dse.stats.prospectsToday > 0 ? "text-blue-400" : "text-gray-500"}`}>{dse.stats.prospectsToday}</p>
          <p className="text-[9px] text-gray-600">Prosp.</p>
        </div>
        <div className="text-center">
          <p className={`font-semibold ${dse.stats.salesToday > 0 ? "text-emerald-400" : "text-gray-500"}`}>{dse.stats.salesToday}</p>
          <p className="text-[9px] text-gray-600">Sold</p>
        </div>
        <div className="text-center">
          <p className={`font-semibold ${dse.stats.salesMonth > 0 ? "text-yellow-400" : "text-gray-500"}`}>{dse.stats.salesMonth}</p>
          <p className="text-[9px] text-gray-600">Month</p>
        </div>
      </div>

      {/* Arrow */}
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
    </Link>
  );
}
