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
} from "lucide-react";
import { useMemo } from "react";

import { useApiData } from "@/lib/use-api-data";
import type { IUser } from "@/lib/models/User";
import type { IProspect } from "@/lib/models/Prospect";
import type { ISale } from "@/lib/models/Sale";
import type { IFollowUp } from "@/lib/models/FollowUp";

export default function DeveloperDashboardPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = today.slice(0, 7);

  const { data: usersData, loading: loadingUsers } = useApiData<{ users: IUser[] }>("/api/users", { users: [] });
  const { data: prospectsData, loading: loadingProspects } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const { data: salesData, loading: loadingSales } = useApiData<{ sales: ISale[] }>("/api/sales", { sales: [] });
  const { data: followUpsData, loading: loadingFollowUps } = useApiData<{ followUps: IFollowUp[] }>("/api/followups", { followUps: [] });

  const stats = useMemo(() => {
    const users = usersData.users;
    const prospects = prospectsData.prospects;
    const sales = salesData.sales;
    const followUps = followUpsData.followUps;

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
    };
  }, [usersData, prospectsData, salesData, followUpsData, today, currentMonth]);

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
      title: "Follow-ups",
      value: stats.totalFollowUps,
      subtitle: `${stats.openFollowUps} open`,
      icon: Activity,
      gradient: "from-orange-600 to-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">System Overview</h2>
        <p className="mt-1 text-sm text-gray-400">
          Full visibility into your CRM platform at a glance.
        </p>
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
                className="group relative overflow-hidden rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5 transition hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5"
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

          {/* User Breakdown */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Users Section */}
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
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

                <div className="flex items-center gap-3 rounded-xl bg-[#252550] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">SuperAdmin (You)</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-emerald-400">Full access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Section */}
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Activity Overview</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#252550] p-3">
                  <p className="text-xs text-gray-400">Prospects Today</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.prospectsToday}</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3">
                  <p className="text-xs text-gray-400">Sales Today</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.salesToday}</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3">
                  <p className="text-xs text-gray-400">Month Prospects</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.prospectsMonth}</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3">
                  <p className="text-xs text-gray-400">Month Sales</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.salesMonth}</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3">
                  <p className="text-xs text-gray-400">Open Follow-ups</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.openFollowUps}</p>
                </div>
                <div className="rounded-xl bg-[#252550] p-3">
                  <p className="text-xs text-gray-400">Total Follow-ups</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.totalFollowUps}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-purple-400" />
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
    </div>
  );
}

