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
  MapPin,
  Phone,
  Award,
  Trophy,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

import { useApiData } from "@/lib/use-api-data";
import { getTodayLocal } from "@/lib/time-utils";
import { COMMISSION_PER_SALE } from "@/lib/supervisor-utils";
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
  lastActiveAt: string;
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

// A user is "online" when their last heartbeat/last-seen is within 5 minutes
// (heartbeats are sent every 2 minutes while the app is open).
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function isOnline(lastSeen: string, now: number): boolean {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return now - t < ONLINE_WINDOW_MS;
}

function formatClockTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Performance rank colors ──
const RANK_COLORS = [
  { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", medal: "🥇" },
  { bg: "bg-gray-300/20", text: "text-gray-300", border: "border-gray-400/30", medal: "🥈" },
  { bg: "bg-amber-700/20", text: "text-amber-600", border: "border-amber-700/30", medal: "🥉" },
  { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", medal: "4" },
  { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", medal: "5" },
];

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const currentMonth = today.slice(0, 7);

  const { data: usersData, loading: loadingUsers, refetch: refetchUsers } = useApiData<{ users: IUser[] }>("/api/users", { users: [] });
  const { data: prospectsData, loading: loadingProspects } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const { data: salesData, loading: loadingSales } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const { data: followUpsData, loading: loadingFollowUps } = useApiData<{ followUps: IFollowUp[] }>("/api/followups", { followUps: [] });
  const { data: groupedData, loading: loadingGrouped, refetch: refetchGrouped } = useApiData<{ teams: SupervisorTeam[]; unassigned: SupervisorTeam }>(
    "/api/supervisors/grouped",
    { teams: [], unassigned: FALLBACK_UNASSIGNED }
  );

  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [showSupervisorList, setShowSupervisorList] = useState(false);
  const [showDseList, setShowDseList] = useState(false);

  // Live clock used for online/last-seen status in the Active Today modal.
  // Only ticks while the modal is open to avoid needless re-renders.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!showActiveUsers) return;
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [showActiveUsers]);

  // Refresh activity data so the Active Today modal shows up-to-date statuses
  const openActiveUsers = () => {
    setNow(Date.now());
    setShowActiveUsers(true);
    refetchUsers().catch(() => {});
    refetchGrouped().catch(() => {});
  };

  const toggleTeam = (name: string) => {
    setExpandedTeams((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Close modals on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowActiveUsers(false);
        setShowSupervisorList(false);
        setShowDseList(false);
      }
    };
    if (showActiveUsers || showSupervisorList || showDseList) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [showActiveUsers, showSupervisorList, showDseList]);

  const stats = useMemo(() => {
    const users = usersData.users;
    const prospects = prospectsData.prospects;
    const sales = salesData.sales;
    const followUps = followUpsData.followUps;

    // Collect all active DSEs from grouped data
    const activeDses: { name: string; region: string; cugSuffix: string; lastLogin: string; lastActiveAt: string; supervisor: string; stats: DseStats }[] = [];
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

    // Active supervisors from users data — BOTH lastActiveAt AND lastLogin
    const activeSupervisors = users.filter((u) => u.role === "SUPERVISOR" && (u.lastActiveAt?.startsWith(today) || u.lastLogin?.startsWith(today))).map((u) => ({
      name: u.name,
      region: u.region,
      cugSuffix: u.cugSuffix,
      lastLogin: u.lastActiveAt || u.lastLogin || "",
    }));

    // Also count DSEs that logged in today but may not have heartbeat yet
    const dseLoggedInToday = users.filter((u) => u.role === "DSE" && u.lastLogin?.startsWith(today) && !u.lastActiveAt?.startsWith(today));
    const activeToday = activeDses.length + activeSupervisors.length + dseLoggedInToday.length;

    // Logged-in-today DSEs (no heartbeat yet) — shown in the Active Today modal
    // with their last-login as the last-seen time.
    const dseLoggedInTodayList: { name: string; region: string; cugSuffix: string; lastLogin: string; lastActiveAt: string; supervisor: string; stats: DseStats }[] = dseLoggedInToday.map((u) => ({
      name: u.name,
      region: u.region,
      cugSuffix: u.cugSuffix,
      lastLogin: u.lastLogin || "",
      lastActiveAt: "",
      supervisor: u.supervisor || "Unassigned",
      stats: {
        prospectsToday: prospects.filter((p) => p.assignedDse === u.name && p.createdAt === today).length,
        prospectsMonth: prospects.filter((p) => p.assignedDse === u.name && p.createdAt?.slice(0, 7) === currentMonth).length,
        salesToday: sales.filter((s) => s.soldBy === u.name && s.date === today).length,
        salesWeek: 0,
        salesMonth: sales.filter((s) => s.soldBy === u.name && s.date.slice(0, 7) === currentMonth).length,
      },
    }));

    // ── Build list of ALL DSEs with their supervisor ──
    const allDseList: { name: string; cugSuffix: string; region: string; supervisor: string; salesMonth: number; salesToday: number; prospectsMonth: number }[] = [];
    for (const team of groupedData.teams) {
      for (const dse of team.dseMembers) {
        allDseList.push({
          name: dse.name,
          cugSuffix: dse.cugSuffix,
          region: dse.region,
          supervisor: team.supervisor.name,
          salesMonth: dse.stats.salesMonth,
          salesToday: dse.stats.salesToday,
          prospectsMonth: dse.stats.prospectsMonth,
        });
      }
    }
    for (const dse of groupedData.unassigned.dseMembers) {
      allDseList.push({
        name: dse.name,
        cugSuffix: dse.cugSuffix,
        region: dse.region,
        supervisor: "Unassigned",
        salesMonth: dse.stats.salesMonth,
        salesToday: dse.stats.salesToday,
        prospectsMonth: dse.stats.prospectsMonth,
      });
    }

    // ── Top 5 performers by monthly sales ──
    const topPerformers = [...allDseList]
      .sort((a, b) => b.salesMonth - a.salesMonth)
      .slice(0, 5)
      .filter((d) => d.salesMonth > 0);

    // ── Build supervisor list with team info ──
    const supervisorList = groupedData.teams.map((team) => ({
      name: team.supervisor.name,
      region: team.supervisor.region,
      cugSuffix: team.supervisor.cugSuffix,
      totalDse: team.stats.totalDse,
      activeToday: team.stats.activeToday ?? 0,
      salesMonth: team.stats.salesMonth,
      prospectsMonth: team.stats.prospectsMonth,
      dseMembers: team.dseMembers.map((d) => d.name),
    }));

    console.log(`[DASHBOARD] Stats computed at ${new Date().toLocaleTimeString()}`);
    console.log(`[DASHBOARD] Users: ${users.length} | DSEs: ${allDseList.length} | Sup: ${supervisorList.length}`);
    console.log(`[DASHBOARD] Active Today: ${activeToday} (${activeDses.length} DSEs + ${activeSupervisors.length} Sup + ${dseLoggedInToday.length} logged-in)`);
    console.log(`[DASHBOARD] Prospects: ${prospects.length} | Sales: ${sales.length} | Follow-ups: ${followUps.length}`);
    console.log(`[DASHBOARD] Top performers:`, topPerformers.map((d) => `${d.name} (${d.salesMonth} sales)`));

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
      monthRevenue: sales.filter((s) => s.date.slice(0, 7) === currentMonth).length * COMMISSION_PER_SALE,
      allTimeRevenue: sales.length * COMMISSION_PER_SALE,
      totalFollowUps: followUps.length,
      openFollowUps: followUps.filter((f) => f.status === "TODAY" || f.status === "OVERDUE").length,
      activeToday,
      activeDses,
      activeSupervisors,
      dseLoggedInTodayList,
      topPerformers,
      supervisorList,
      allDseList: allDseList.sort((a, b) => b.salesMonth - a.salesMonth),
    };
  }, [usersData, prospectsData, salesData, followUpsData, groupedData, today, currentMonth]);

  // Every DSE that was active at some point today (heartbeat today OR logged in today)
  const allActiveDses = useMemo(
    () => [...stats.activeDses, ...stats.dseLoggedInTodayList],
    [stats.activeDses, stats.dseLoggedInTodayList]
  );

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
      onClick: () => router.push("/developer/prospects"),
    },
    {
      title: "Sales",
      value: stats.totalSales,
      subtitle: `${stats.salesToday} today · ${stats.salesMonth} this month`,
      icon: ShoppingCart,
      gradient: "from-emerald-600 to-teal-600",
      onClick: () => router.push("/developer/sales"),
    },
    {
      title: "Commission (Month)",
      value: `K${stats.monthRevenue.toLocaleString()}`,
      subtitle: "This month's sales · all DSEs",
      icon: DollarSign,
      gradient: "from-emerald-600 to-cyan-600",
      onClick: () => router.push("/developer/sales"),
    },
    {
      title: "Commission (All-time)",
      value: `K${stats.allTimeRevenue.toLocaleString()}`,
      subtitle: "Every sale across the system",
      icon: DollarSign,
      gradient: "from-teal-600 to-blue-600",
      onClick: () => router.push("/developer/sales"),
    },
    {
      title: "Active Today",
      value: stats.activeToday,
      subtitle: `${stats.totalDse > 0 ? Math.round((stats.activeToday / stats.totalDse) * 100) : 0}% of DSEs active`,
      icon: Zap,
      gradient: "from-orange-600 to-pink-600",
      onClick: stats.activeToday > 0 ? openActiveUsers : undefined,
    },
  ];

  const secondaryCards = [
    {
      title: "Supervisors",
      value: stats.totalSupervisors,
      subtitle: `${stats.supervisorList.length} with teams`,
      icon: Shield,
      gradient: "from-blue-600 to-indigo-600",
      onClick: () => setShowSupervisorList(true),
    },
    {
      title: "Follow-ups",
      value: stats.totalFollowUps,
      subtitle: `${stats.openFollowUps} open (TODAY/OVERDUE)`,
      icon: Clock,
      gradient: "from-orange-600 to-red-600",
      onClick: () => router.push("/developer/followups"),
    },
  ];

  return (
    <div className="max-w-full overflow-x-hidden space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white sm:text-xl">System Overview</h2>
          <p className="mt-0.5 text-xs text-gray-400 sm:mt-1 sm:text-sm">
            Full visibility into your CRM platform at a glance.
          </p>
        </div>
        {/* Pulse indicator */}
        <div className="self-start shrink-0 flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 sm:px-3 sm:py-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 sm:h-2 sm:w-2" />
          <span className="text-[10px] font-medium text-emerald-300 sm:text-xs">Live</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-500" />
        </div>
      ) : (
        <>
          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[...statCards, ...secondaryCards].map((card) => (
              <div
                key={card.title}
                onClick={card.onClick}
                className={`group relative overflow-hidden rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-3 transition hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 sm:rounded-2xl sm:p-4 ${typeof card.onClick === 'function' ? 'cursor-pointer active:scale-[0.98]' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.03]`} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[10px]">
                      {card.title}
                    </span>
                    <card.icon className="h-3 w-3 text-purple-400 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-white sm:mt-2 sm:text-2xl">{card.value}</p>
                  <p className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">{card.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Middle row: Top 5 Performers + User Breakdown + Today's Pulse ── */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* ═══ TOP 5 PERFORMERS ═══ */}
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Top 5 Performers</h3>
                <span className="ml-auto text-[10px] text-gray-500">Monthly sales</span>
              </div>

              {stats.topPerformers.length > 0 ? (
                <div className="space-y-2">
                  {stats.topPerformers.map((dse, idx) => {
                    const rank = RANK_COLORS[idx] || RANK_COLORS[4];
                    return (
                      <div
                        key={dse.name}
                        className={`flex items-center gap-3 rounded-xl ${rank.bg} ${rank.border} p-2.5 transition hover:opacity-80`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${rank.bg} text-xs font-bold ${rank.text}`}>
                          {rank.medal === "4" || rank.medal === "5" ? rank.medal : <span className="text-base">{rank.medal}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-white">{dse.name}</span>
                            {dse.salesToday > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Has sales today" />
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {dse.salesMonth} sales · Sup: {dse.supervisor}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${rank.text}`}>{dse.salesMonth}</p>
                          <p className="text-[9px] text-gray-500">sales</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <TrendingUp className="h-8 w-8 text-gray-600" />
                  <p className="mt-2 text-xs text-gray-500">No sales data yet this month.</p>
                </div>
              )}
            </div>

            {/* ═══ USER BREAKDOWN ═══ */}
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">User Breakdown</h3>
              </div>

              <div className="space-y-3">
                <div
                  onClick={() => setShowDseList(true)}
                  className="flex items-center gap-3 rounded-xl bg-[#252550] p-3 transition hover:bg-[#2f2f60] cursor-pointer"
                >
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
                  <ArrowUpRight className="h-3.5 w-3.5 text-gray-500" />
                </div>

                <div
                  onClick={() => setShowSupervisorList(true)}
                  className="flex items-center gap-3 rounded-xl bg-[#252550] p-3 transition hover:bg-[#2f2f60] cursor-pointer"
                >
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
                  <ArrowUpRight className="h-3.5 w-3.5 text-gray-500" />
                </div>
              </div>
            </div>

            {/* ═══ TODAY'S PULSE ═══ */}
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Today&apos;s Pulse</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={openActiveUsers}
                  className="rounded-xl bg-[#252550] p-3 text-center transition hover:bg-[#2f2f60] cursor-pointer"
                >
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
                <div
                  onClick={() => router.push("/developer/followups")}
                  className="rounded-xl bg-[#252550] p-3 text-center transition hover:bg-[#2f2f60] cursor-pointer"
                >
                  <Activity className="mx-auto h-5 w-5 text-orange-400" />
                  <p className="mt-1 text-2xl font-bold text-white">{stats.openFollowUps}</p>
                  <p className="text-[10px] text-gray-400">Open F/Up</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
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
                href="/developer/prospects"
                className="inline-flex items-center gap-2 rounded-xl bg-[#252550] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-blue-600/20 hover:text-blue-400"
              >
                <Target className="h-4 w-4" />
                All Prospects
              </a>
              <a
                href="/developer/sales"
                className="inline-flex items-center gap-2 rounded-xl bg-[#252550] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-emerald-600/20 hover:text-emerald-400"
              >
                <ShoppingCart className="h-4 w-4" />
                All Sales
              </a>
              <a
                href="/developer/followups"
                className="inline-flex items-center gap-2 rounded-xl bg-[#252550] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-orange-600/20 hover:text-orange-400"
              >
                <Clock className="h-4 w-4" />
                Follow-ups
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

      {/* ═══ Supervisor Teams Section ═══ */}
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
                    onClick={() => {
                      toggleTeam(team.supervisor.name);
                      console.log(`[DASHBOARD] Toggled supervisor: ${team.supervisor.name} (${team.stats.totalDse} DSEs, ${team.stats.salesMonth} sales, ${team.stats.activeToday} active)`);
                    }}
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

      {/* Debug Console Section */}
      <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <TerminalIcon className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider sm:text-xs">Debug Console</p>
        </div>
        <pre className="text-[9px] sm:text-[10px] text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto max-w-full">
{`[DASHBOARD] Users: ${stats.totalUsers} | DSEs: ${stats.totalDse} | Sup: ${stats.totalSupervisors}
[DASHBOARD] Active Today: ${stats.activeToday} | Prospects: ${stats.totalProspects} | Sales: ${stats.totalSales}
[DASHBOARD] Today: ${stats.prospectsToday} prosp / ${stats.salesToday} sales | Month: ${stats.prospectsMonth} prosp / ${stats.salesMonth} sales
[DASHBOARD] Follow-ups: ${stats.totalFollowUps} total / ${stats.openFollowUps} open | Teams: ${groupedData.teams.length} sup / ${groupedData.unassigned.stats.totalDse} unassigned
[DASHBOARD] Top 5: ${stats.topPerformers.map(d => `${d.name}(${d.salesMonth})`).join(" / ") || "none"}
[DASHBOARD] Last updated: ${new Date().toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
        </pre>
      </div>

      {/* ── Active Users Modal ── */}
      {showActiveUsers && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto pt-4 pb-8 sm:pt-10">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowActiveUsers(false)} />
          <div className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-2xl rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-2xl shadow-purple-500/10 sm:w-[calc(100%-2rem)]">
            <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="h-4 w-4 shrink-0 text-orange-400 sm:h-5 sm:w-5" />
                <h2 className="text-base font-bold text-white truncate sm:text-lg">Active Today</h2>
                <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-300 sm:text-xs sm:px-2.5">
                  {stats.activeToday} user{stats.activeToday !== 1 ? "s" : ""}
                </span>
              </div>
              <button type="button" onClick={() => setShowActiveUsers(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 transition hover:bg-gray-600 hover:text-white sm:h-8 sm:w-8">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4 sm:p-5 sm:space-y-5">
              {allActiveDses.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 sm:mb-3">
                    <Users className="h-3.5 w-3.5 text-purple-400 sm:h-4 sm:w-4" />
                    <h3 className="text-xs font-semibold text-white sm:text-sm">Direct Sales Executives</h3>
                    <span className="ml-auto text-[10px] text-gray-500 sm:text-xs">{allActiveDses.length} active today</span>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {allActiveDses.map((dse) => {
                      const lastSeen = dse.lastActiveAt || dse.lastLogin || "";
                      const online = isOnline(lastSeen, now);
                      return (
                        <Link
                          key={dse.name}
                          href={`/developer/dse/${encodeURIComponent(dse.name)}`}
                          className={`flex items-center gap-2 rounded-xl border p-2.5 transition hover:bg-emerald-500/10 sm:p-3 sm:gap-3 ${
                            online ? "border-emerald-500/30 bg-emerald-500/5" : "border-gray-700/50 bg-[#252550]/40"
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 sm:text-sm ${online ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-600/30 text-gray-300"}`}>{dse.name.charAt(0)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-medium text-white truncate sm:text-sm">{dse.name}</span>
                              <span className="shrink-0 rounded-full bg-emerald-500/15 px-1 py-0.5 text-[8px] font-medium text-emerald-400 sm:px-1.5 sm:text-[9px]">DSE</span>
                              {online ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300 sm:px-2 sm:text-[9px]">
                                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" /> Online
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-gray-600/40 px-1.5 py-0.5 text-[8px] font-medium text-gray-400 sm:px-2 sm:text-[9px]">Offline</span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-400 sm:text-[10px] sm:gap-x-3">
                              <span className="inline-flex items-center gap-0.5"><MapPin className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{dse.region}</span>
                              <span className="inline-flex items-center gap-0.5"><Phone className="h-2 w-2 sm:h-2.5 sm:w-2.5" />CUG: {dse.cugSuffix}</span>
                              <span className="hidden text-gray-500 sm:inline">· Sup: {dse.supervisor}</span>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-gray-500 sm:text-[10px]">
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              Last seen at {formatClockTime(lastSeen)}
                              {online ? " · Online now" : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 text-[10px] sm:text-xs sm:gap-2.5">
                            <div className="text-center">
                              <p className={`font-semibold leading-tight ${dse.stats.prospectsToday > 0 ? "text-blue-400" : "text-gray-500"}`}>{dse.stats.prospectsToday}</p>
                              <p className="text-[8px] text-gray-600 sm:text-[9px]">Pr.</p>
                            </div>
                            <div className="text-center">
                              <p className={`font-semibold leading-tight ${dse.stats.salesToday > 0 ? "text-emerald-400" : "text-gray-500"}`}>{dse.stats.salesToday}</p>
                              <p className="text-[8px] text-gray-600 sm:text-[9px]">Sld</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
              {stats.activeSupervisors && stats.activeSupervisors.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 sm:mb-3">
                    <Shield className="h-3.5 w-3.5 text-blue-400 sm:h-4 sm:w-4" />
                    <h3 className="text-xs font-semibold text-white sm:text-sm">Supervisors</h3>
                    <span className="ml-auto text-[10px] text-gray-500 sm:text-xs">{stats.activeSupervisors.length} active</span>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {stats.activeSupervisors.map((sup: { name: string; region: string; cugSuffix: string; lastLogin: string }) => {
                      const lastSeen = sup.lastLogin || "";
                      const online = isOnline(lastSeen, now);
                      return (
                        <div key={sup.name} className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-2.5 sm:p-3 sm:gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 sm:h-10 sm:w-10 sm:text-sm">{sup.name.charAt(0)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-medium text-white truncate sm:text-sm">{sup.name}</span>
                              <span className="shrink-0 rounded-full bg-blue-500/15 px-1 py-0.5 text-[8px] font-medium text-blue-400 sm:px-1.5 sm:text-[9px]">Supervisor</span>
                              {online ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300 sm:px-2 sm:text-[9px]">
                                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" /> Online
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-gray-600/40 px-1.5 py-0.5 text-[8px] font-medium text-gray-400 sm:px-2 sm:text-[9px]">Offline</span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-400 sm:text-[10px] sm:gap-x-3">
                              <span className="inline-flex items-center gap-0.5"><MapPin className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{sup.region}</span>
                              <span className="inline-flex items-center gap-0.5"><Phone className="h-2 w-2 sm:h-2.5 sm:w-2.5" />CUG: {sup.cugSuffix}</span>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-gray-500 sm:text-[10px]">
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              Last seen at {formatClockTime(lastSeen)}
                              {online ? " · Online now" : ""}
                            </p>
                          </div>
                          <Award className="h-3.5 w-3.5 shrink-0 text-blue-400 sm:h-4 sm:w-4" />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {allActiveDses.length === 0 && (!stats.activeSupervisors || stats.activeSupervisors.length === 0) && (
                <div className="flex flex-col items-center justify-center py-6 text-center sm:py-10">
                  <Zap className="h-8 w-8 text-gray-600 sm:h-12 sm:w-12" />
                  <p className="mt-2 text-xs text-gray-400 sm:mt-3 sm:text-sm">No active users today yet.</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">Activity data will appear once users log in.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Supervisor List Modal ── */}
      {showSupervisorList && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto pt-4 pb-8 sm:pt-10">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSupervisorList(false)} />
          <div className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-2xl rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-2xl shadow-purple-500/10 sm:w-[calc(100%-2rem)]">
            <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="h-4 w-4 shrink-0 text-blue-400 sm:h-5 sm:w-5" />
                <h2 className="text-base font-bold text-white truncate sm:text-lg">All Supervisors</h2>
                <span className="shrink-0 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300 sm:text-xs sm:px-2.5">{stats.supervisorList.length}</span>
              </div>
              <button type="button" onClick={() => setShowSupervisorList(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 transition hover:bg-gray-600 hover:text-white sm:h-8 sm:w-8">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3 sm:p-5">
              {stats.supervisorList.length > 0 ? (
                stats.supervisorList.map((sup) => (
                  <div key={sup.name} className="rounded-xl border border-gray-700/50 bg-[#252550]/50 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 sm:items-center">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400 sm:h-10 sm:w-10 sm:text-sm">
                          {sup.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate sm:text-sm">{sup.name}</p>
                          <p className="text-[9px] text-gray-400 truncate sm:text-xs">{sup.region} · CUG: {sup.cugSuffix}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-[10px] sm:gap-3 sm:text-xs">
                        <div className="text-center">
                          <p className="font-semibold text-blue-400">{sup.totalDse}</p>
                          <p className="text-[8px] text-gray-500 sm:text-[9px]">DSEs</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-emerald-400">{sup.salesMonth}</p>
                          <p className="text-[8px] text-gray-500 sm:text-[9px]">Sales</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-orange-400">{sup.activeToday}</p>
                          <p className="text-[8px] text-gray-500 sm:text-[9px]">Active</p>
                        </div>
                      </div>
                    </div>
                    {/* Team members */}
                    {sup.dseMembers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700/30 sm:mt-3 sm:pt-3">
                        <p className="text-[9px] font-semibold text-gray-500 mb-1 sm:text-[10px] sm:mb-1.5">Team members:</p>
                        <div className="flex flex-wrap gap-1">
                          {sup.dseMembers.map((name) => (
                            <Link
                              key={name}
                              href={`/developer/dse/${encodeURIComponent(name)}`}
                              className="inline-flex items-center gap-0.5 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[8px] text-purple-300 transition hover:bg-purple-500/20 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-[10px]"
                            >
                              <UserPlus className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                              {name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-6 text-center sm:py-10">
                  <Shield className="h-8 w-8 text-gray-600 sm:h-12 sm:w-12" />
                  <p className="mt-2 text-xs text-gray-500 sm:text-sm">No supervisors registered yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DSE List Modal ── */}
      {showDseList && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto pt-4 pb-8 sm:pt-10">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDseList(false)} />
          <div className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-2xl rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-2xl shadow-purple-500/10 sm:w-[calc(100%-2rem)]">
            <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 min-w-0">
                <UserPlus className="h-4 w-4 shrink-0 text-purple-400 sm:h-5 sm:w-5" />
                <h2 className="text-base font-bold text-white truncate sm:text-lg">All DSEs</h2>
                <span className="shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300 sm:text-xs sm:px-2.5">{stats.allDseList.length}</span>
              </div>
              <button type="button" onClick={() => setShowDseList(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 transition hover:bg-gray-600 hover:text-white sm:h-8 sm:w-8">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-2 sm:p-5">
              {stats.allDseList.length > 0 ? (
                stats.allDseList.map((dse) => (
                  <Link
                    key={dse.name}
                    href={`/developer/dse/${encodeURIComponent(dse.name)}`}
                    className="flex items-center gap-2 rounded-xl border border-gray-700/50 bg-[#252550]/50 p-2.5 transition hover:bg-[#2f2f60] sm:p-3 sm:gap-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-400 sm:h-10 sm:w-10 sm:text-sm">
                      {dse.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate sm:text-sm">{dse.name}</p>
                      <p className="text-[9px] text-gray-400 truncate sm:text-xs">
                        Sup: {dse.supervisor} · {dse.region} · CUG: {dse.cugSuffix}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[10px] sm:gap-3 sm:text-xs">
                      <div className="text-center">
                        <p className={`font-semibold leading-tight ${dse.salesMonth > 0 ? "text-emerald-400" : "text-gray-500"}`}>{dse.salesMonth}</p>
                        <p className="text-[8px] text-gray-600 sm:text-[9px]">Sales</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-semibold leading-tight ${dse.prospectsMonth > 0 ? "text-blue-400" : "text-gray-500"}`}>{dse.prospectsMonth}</p>
                        <p className="text-[8px] text-gray-600 sm:text-[9px]">Prosp.</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center py-6 text-center sm:py-10">
                  <UserPlus className="h-8 w-8 text-gray-600 sm:h-12 sm:w-12" />
                  <p className="mt-2 text-xs text-gray-500 sm:text-sm">No DSEs registered yet.</p>
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

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}
