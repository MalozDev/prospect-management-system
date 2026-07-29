"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  PhoneCall,
  BellRing,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  ChevronDown,
  Calendar,
  MessageSquare,
  CheckCheck,
  X,
  RefreshCw,
  UserCheck,
  Sun,
  ExternalLink,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import { formatRelativeTime, getTodayLocal } from "@/lib/time-utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buildDseWhatsAppUrl } from "@/lib/cug-phone";
import { buildDseReminderMessage, buildDseBatchMessage } from "@/lib/whatsapp";
import type { IFollowUp } from "@/lib/models/FollowUp";
import type { IUser } from "@/lib/models/User";

// ── Helpers ──

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DateGroupKey = "overdue" | "today" | "tomorrow" | "this_week" | "future" | "completed";

const GROUP_META: Record<DateGroupKey, { label: string; icon: typeof AlertTriangle; color: string; headerBg: string; headerText: string; badgeBg: string; badgeText: string; border: string }> = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    color: "red",
    headerBg: "bg-red-500/5",
    headerText: "text-red-300",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-300",
    border: "border-red-500/30",
  },
  today: {
    label: "Today",
    icon: Clock,
    color: "orange",
    headerBg: "bg-orange-500/5",
    headerText: "text-orange-300",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-300",
    border: "border-orange-500/30",
  },
  tomorrow: {
    label: "Tomorrow",
    icon: Sun,
    color: "blue",
    headerBg: "bg-blue-500/5",
    headerText: "text-blue-300",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    border: "border-blue-500/30",
  },
  this_week: {
    label: "This Week",
    icon: Calendar,
    color: "purple",
    headerBg: "bg-purple-500/5",
    headerText: "text-purple-300",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    border: "border-purple-500/30",
  },
  future: {
    label: "Later",
    icon: Calendar,
    color: "gray",
    headerBg: "bg-gray-500/5",
    headerText: "text-gray-300",
    badgeBg: "bg-gray-500/20",
    badgeText: "text-gray-300",
    border: "border-gray-500/30",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "green",
    headerBg: "bg-emerald-500/5",
    headerText: "text-emerald-300",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    border: "border-emerald-500/30",
  },
};

const GROUP_ORDER: DateGroupKey[] = ["overdue", "today", "tomorrow", "this_week", "future", "completed"];

type TabKey = "all" | "overdue" | "today" | "upcoming" | "completed";

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "all", label: "All", color: "text-purple-400" },
  { key: "overdue", label: "Overdue", color: "text-red-400" },
  { key: "today", label: "Today", color: "text-orange-400" },
  { key: "upcoming", label: "Upcoming", color: "text-blue-400" },
  { key: "completed", label: "Completed", color: "text-emerald-400" },
];

export default function DeveloperFollowupsPage() {
  const [search, setSearch] = useState("");
  const [selectedDse, setSelectedDse] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [sendingReminder, setSendingReminder] = useState<Set<string>>(new Set());
  const [reminderFeedback, setReminderFeedback] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const { data: followUpsData, loading: loadingFollowUps, refetch: refetchFollowUps } = useApiData<{ followUps: IFollowUp[] }>(
    "/api/followups",
    { followUps: [] }
  );
  const { data: usersData, loading: loadingUsers } = useApiData<{ users: IUser[] }>(
    "/api/users",
    { users: [] }
  );

  const followUps = followUpsData.followUps;
  const users = usersData.users;

  // Build maps
  const dseSupervisorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of users) {
      if (u.role === "DSE") map[u.name] = u.supervisor || "Unassigned";
    }
    return map;
  }, [users]);

  const dseInfoMap = useMemo(() => {
    const map: Record<string, { cugSuffix: string; phone: string }> = {};
    for (const u of users) {
      if (u.role === "DSE") {
        map[u.name] = { cugSuffix: u.cugSuffix, phone: u.phone || "" };
      }
    }
    return map;
  }, [users]);

  // DSE names list for filter
  const dseNames = useMemo(() => {
    const names = new Set(followUps.map((f) => f.assignedDse).filter(Boolean));
    return Array.from(names).sort();
  }, [followUps]);

  // ── Date group logic ──
  const todayLocal = useMemo(() => getTodayLocal(), []);
  const tomorrowLocal = useMemo(() => addDays(todayLocal, 1), [todayLocal]);
  const nextWeekLocal = useMemo(() => addDays(todayLocal, 7), [todayLocal]);

  function getGroupKey(fu: IFollowUp): DateGroupKey {
    if (fu.status === "COMPLETED") return "completed";
    if (fu.status === "OVERDUE" || (fu.status === "UPCOMING" && fu.expectedPurchaseDate < todayLocal)) return "overdue";
    if (fu.status === "TODAY" || fu.expectedPurchaseDate === todayLocal) return "today";
    if (fu.expectedPurchaseDate === tomorrowLocal) return "tomorrow";
    if (fu.expectedPurchaseDate <= nextWeekLocal) return "this_week";
    return "future";
  }

  // Filter + group follow-ups
  const { groupedFollowUps, filteredCount } = useMemo(() => {
    let items = followUps;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (f) =>
          f.customerName.toLowerCase().includes(q) ||
          (f.assignedDse || "").toLowerCase().includes(q)
      );
    }

    // DSE filter
    if (selectedDse !== "all") {
      items = items.filter((f) => f.assignedDse === selectedDse);
    }

    // Tab filter
    if (activeTab === "overdue") items = items.filter((f) => getGroupKey(f) === "overdue");
    else if (activeTab === "today") items = items.filter((f) => getGroupKey(f) === "today");
    else if (activeTab === "upcoming") items = items.filter((f) => ["tomorrow", "this_week", "future"].includes(getGroupKey(f)));
    else if (activeTab === "completed") items = items.filter((f) => getGroupKey(f) === "completed");

    const groups: Record<DateGroupKey, IFollowUp[]> = {
      overdue: [], today: [], tomorrow: [], this_week: [], future: [], completed: [],
    };
    for (const fu of items) {
      const key = getGroupKey(fu);
      groups[key].push(fu);
    }

    // Sort within groups
    for (const key of GROUP_ORDER) {
      if (key === "completed") {
        // Most recently completed first — sort by followUpSeenAt descending
        groups[key].sort((a, b) => {
          const aSeen = a.followUpSeenAt || "";
          const bSeen = b.followUpSeenAt || "";
          return bSeen.localeCompare(aSeen);
        });
      } else if (key === "overdue") {
        // Most overdue first (oldest due date first)
        groups[key].sort((a, b) => a.expectedPurchaseDate.localeCompare(b.expectedPurchaseDate));
      } else {
        // By date then DSE
        groups[key].sort((a, b) => {
          const dateCmp = a.expectedPurchaseDate.localeCompare(b.expectedPurchaseDate);
          if (dateCmp !== 0) return dateCmp;
          return (a.assignedDse || "").localeCompare(b.assignedDse || "");
        });
      }
    }

    const count = items.length;
    return { groupedFollowUps: groups, filteredCount: count };
  }, [followUps, search, selectedDse, activeTab, todayLocal, tomorrowLocal, nextWeekLocal]);

  // Stats
  const stats = useMemo(() => {
    const total = followUps.length;
    const overdue = followUps.filter((f) => getGroupKey(f) === "overdue").length;
    const today = followUps.filter((f) => getGroupKey(f) === "today").length;
    const upcoming = followUps.filter((f) => ["tomorrow", "this_week", "future"].includes(getGroupKey(f))).length;
    const completed = followUps.filter((f) => f.status === "COMPLETED").length;
    const unseen = followUps.filter((f) => !f.followUpSeenAt && f.status !== "COMPLETED").length;
    return { total, today, overdue, upcoming, completed, unseen };
  }, [followUps, todayLocal, tomorrowLocal, nextWeekLocal]);

  // Batch data
  const batchData = useMemo(() => {
    const todayFus = followUps.filter((f) => f.status === "TODAY" || f.expectedPurchaseDate === todayLocal);
    const groups: Record<string, IFollowUp[]> = {};
    for (const fu of todayFus) {
      const dse = fu.assignedDse || "Unassigned";
      if (!groups[dse]) groups[dse] = [];
      groups[dse].push(fu);
    }
    return Object.entries(groups)
      .map(([dseName, items]) => {
        const info = dseInfoMap[dseName];
        const message = buildDseBatchMessage({
          dseName,
          followups: items.map((f) => ({
            prospectName: f.customerName,
            status: f.status,
            dueDate: f.expectedPurchaseDate,
          })),
        });
        const waUrl = info?.cugSuffix ? buildDseWhatsAppUrl(info.cugSuffix, message) : null;
        return { dseName, count: items.length, message, waUrl, items };
      })
      .sort((a, b) => b.count - a.count);
  }, [followUps, dseInfoMap, todayLocal]);

  const todayCount = batchData.reduce((sum, d) => sum + d.count, 0);

  // Handlers
  const handleSendReminder = useCallback(async (followUpId: string) => {
    setSendingReminder((prev) => new Set(prev).add(followUpId));
    setReminderFeedback(null);
    try {
      const result = await apiFetch<{ ok: boolean; message: string }>("/api/followups/remind", {
        method: "POST",
        body: JSON.stringify({ followUpId }),
      });
      setReminderFeedback({ id: followUpId, ok: true, message: result.message });
      setTimeout(() => setReminderFeedback(null), 3000);
    } catch (err) {
      setReminderFeedback({
        id: followUpId,
        ok: false,
        message: err instanceof Error ? err.message : "Failed to send reminder",
      });
      setTimeout(() => setReminderFeedback(null), 5000);
    } finally {
      setSendingReminder((prev) => {
        const next = new Set(prev);
        next.delete(followUpId);
        return next;
      });
    }
  }, []);

  const handleWhatsAppDse = useCallback((cugSuffix: string, message: string) => {
    window.open(buildDseWhatsAppUrl(cugSuffix, message), "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PhoneCall className="h-5 w-5 text-purple-400 shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-white">Follow-ups</h2>
            <p className="mt-1 text-sm text-gray-400">
              Grouped by date — see what&apos;s overdue, due today, and coming up.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {todayCount > 0 && (
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <Sun className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send Today&apos;s</span>
              <span>Batch</span>
              <span>({todayCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => refetchFollowUps()}
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#252550] px-3 py-2 text-xs text-gray-300 transition hover:bg-[#2f2f60]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
        <StatBox icon={PhoneCall} label="Total" value={String(stats.total)} color="purple" />
        <StatBox icon={Clock} label="Today" value={String(stats.today)} color="orange" />
        <StatBox icon={AlertTriangle} label="Overdue" value={String(stats.overdue)} color="red" />
        <StatBox icon={Calendar} label="Upcoming" value={String(stats.upcoming)} color="blue" />
        <StatBox icon={CheckCircle2} label="Done" value={String(stats.completed)} color="green" />
        <StatBox icon={UserCheck} label="Unseen" value={String(stats.unseen)} color="pink" />
      </div>

      {/* ── Quick-filter Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map(({ key, label, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
              activeTab === key
                ? `bg-[#252550] ${color} border border-gray-600 shadow-sm`
                : "text-gray-500 hover:text-gray-300 hover:bg-[#252550]/50 border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search & DSE filter ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by prospect or DSE name..."
            className="h-10 sm:h-11 w-full rounded-xl border border-gray-700/50 bg-[#1a1a3e] pl-9 sm:pl-10 pr-3 sm:pr-4 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <select
            value={selectedDse}
            onChange={(e) => setSelectedDse(e.target.value)}
            className="appearance-none min-w-0 w-full h-10 sm:h-11 rounded-xl border border-gray-700/50 bg-[#1a1a3e] px-3 sm:px-4 text-xs sm:text-sm text-gray-200 outline-none transition focus:border-purple-500/50"
          >
            <option value="all">All DSEs</option>
            {dseNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* ── Content ── */}
      {loadingFollowUps || loadingUsers ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-500" />
        </div>
      ) : filteredCount > 0 ? (
        <div className="space-y-5">
          {GROUP_ORDER.map((groupKey) => {
            const items = groupedFollowUps[groupKey];
            if (items.length === 0) return null;

            const meta = GROUP_META[groupKey];
            const Icon = meta.icon;

            return (
              <div
                key={groupKey}
                className={`rounded-2xl border ${meta.border} bg-[#1a1a3e] overflow-hidden`}
              >
                {/* Section header */}
                <div className={`flex items-center gap-3 border-b ${meta.border.replace("border", "border").replace("30", "20")} ${meta.headerBg} px-4 py-3`}>
                  <Icon className={`h-4 w-4 ${meta.headerText}`} />
                  <h3 className={`text-sm font-semibold ${meta.headerText}`}>{meta.label}</h3>
                  <span className={`ml-auto rounded-full ${meta.badgeBg} px-2.5 py-0.5 text-[10px] font-medium ${meta.badgeText}`}>
                    {items.length}
                  </span>
                </div>

                {/* Follow-up cards */}
                <div className="divide-y divide-gray-700/30">
                  {items.map((fu) => {
                    const fuId = String(fu._id);
                    const dseName = fu.assignedDse || "Unassigned";
                    const supervisor = dseSupervisorMap[dseName] || "Unassigned";
                    const dseInfo = dseInfoMap[dseName];
                    const isSending = sendingReminder.has(fuId);
                    const feedback = reminderFeedback?.id === fuId ? reminderFeedback : null;
                    const isSeen = !!fu.followUpSeenAt;
                    const isUnseenUrgent = !isSeen && (groupKey === "overdue" || groupKey === "today");

                    return (
                      <div
                        key={fuId}
                        className={`relative px-4 py-3 transition hover:bg-[#252550]/30 ${
                          isUnseenUrgent ? "border-l-2 border-l-red-500/50" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          {/* Left: Prospect info */}
                          <div className="min-w-0 flex-1">
                            {/* Prospect name + status */}
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white truncate">
                                {fu.customerName}
                              </h4>
                              <StatusBadge status={fu.status} dark />
                              {/* Unseen dot */}
                              {!isSeen && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
                              )}
                            </div>

                            {/* DSE + Supervisor + Due date */}
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                              <span className="inline-flex items-center gap-1.5">
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500/20 text-[7px] font-bold text-purple-400">
                                  {dseName.charAt(0)}
                                </div>
                                <span className="text-gray-300 font-medium">{dseName}</span>
                                <span className="text-gray-600">·</span>
                                <Shield className="h-2.5 w-2.5 text-gray-500" />
                                <span>{supervisor}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Calendar className="h-2.5 w-2.5" />
                                {formatDateDisplay(fu.expectedPurchaseDate)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <MessageSquare className="h-2.5 w-2.5" />
                                {fu.category}
                              </span>
                            </div>

                            {/* Seen / Unseen indicator */}
                            <div className="mt-1.5">
                              {isSeen ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/80">
                                  <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                                  Seen {formatRelativeTime(fu.followUpSeenAt)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-400/90">
                                  <span className="flex h-2.5 w-2.5 items-center justify-center">
                                    <span className="absolute h-2 w-2 rounded-full bg-red-500 animate-ping" />
                                    <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
                                  </span>
                                  Not acknowledged
                                </span>
                              )}
                            </div>

                            {/* Feedback on mobile */}
                            {feedback && (
                              <span className={`mt-1 block text-[10px] sm:hidden ${feedback.ok ? "text-emerald-400" : "text-red-400"}`}>
                                {feedback.message}
                              </span>
                            )}
                          </div>

                          {/* Right: Action buttons */}
                          <div className="flex flex-row items-center gap-1.5 shrink-0">
                            {/* Remind button */}
                            <button
                              type="button"
                              onClick={() => handleSendReminder(fuId)}
                              disabled={isSending}
                              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                                isSeen
                                  ? "border border-gray-700 bg-[#252550] text-gray-300 hover:bg-[#2f2f60]"
                                  : "border border-orange-500/40 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25"
                              }`}
                              title={isSeen ? "Send reminder anyway" : "Send push reminder to DSE"}
                            >
                              {isSending ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <BellRing className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* WhatsApp button */}
                            {dseInfo?.cugSuffix && (
                              <button
                                type="button"
                                onClick={() => {
                                  const msg = buildDseReminderMessage({
                                    dseName,
                                    prospectName: fu.customerName,
                                    status: fu.status,
                                    dueDate: fu.expectedPurchaseDate,
                                  });
                                  handleWhatsAppDse(dseInfo.cugSuffix, msg);
                                }}
                                className="flex items-center gap-1.5 rounded-xl border border-green-700/40 bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/20"
                                title="Send WhatsApp reminder to DSE"
                              >
                                <FaWhatsapp className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline text-[10px]">WA</span>
                              </button>
                            )}

                            {/* Feedback on desktop */}
                            {feedback && (
                              <span className={`hidden sm:block text-[10px] ${feedback.ok ? "text-emerald-400" : "text-red-400"}`}>
                                {feedback.message}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-[#1a1a3e] py-16">
          <PhoneCall className="h-12 w-12 text-gray-600" />
          <p className="mt-4 text-sm text-gray-500">No follow-ups found.</p>
          {search && (
            <button type="button" onClick={() => setSearch("")} className="mt-2 text-xs text-purple-400 hover:underline">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* ═══ Morning Batch Modal ═══ */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto pt-4 pb-8 sm:pt-10">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBatchModal(false)} />
          <div className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-2xl rounded-2xl border border-gray-700/50 bg-[#1a1a3e] shadow-2xl shadow-emerald-500/10 sm:w-[calc(100%-2rem)]">
            <div className="flex items-center justify-between border-b border-gray-700/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">Morning Batch</h2>
                  <p className="text-xs text-gray-400">
                    {todayCount} follow-up{todayCount !== 1 ? "s" : ""} due today across {batchData.length} DSE{batchData.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 transition hover:bg-gray-600 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-4">
              {batchData.length > 0 ? (
                batchData.map(({ dseName, count, message, waUrl, items }) => (
                  <div key={dseName} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                          {dseName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{dseName}</p>
                          <p className="text-xs text-gray-400">{count} follow-up{count !== 1 ? "s" : ""} due today</p>
                        </div>
                      </div>
                      {waUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
                          className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700"
                        >
                          <FaWhatsapp className="h-3.5 w-3.5" />
                          Send on WhatsApp
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500">No CUG</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {items.map((fu) => (
                        <div key={String(fu._id)} className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                          <span className="text-xs text-gray-300 truncate">{fu.customerName}</span>
                          <span className="text-[10px] text-gray-500 shrink-0">Due: {fu.expectedPurchaseDate}</span>
                        </div>
                      ))}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-300">Preview message</summary>
                      <pre className="mt-1 rounded-lg bg-black/30 p-2 text-[10px] text-gray-400 font-mono whitespace-pre-wrap">{message}</pre>
                    </details>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <Sun className="h-12 w-12 text-gray-600" />
                  <p className="mt-3 text-sm text-gray-500">No follow-ups due today.</p>
                </div>
              )}
            </div>
            <div className="border-t border-gray-700/50 px-5 py-3">
              <p className="text-[10px] text-gray-500 mb-2">
                Tip: Click each DSE&apos;s WhatsApp button to open their chat with the pre-filled message.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    batchData.forEach(({ waUrl, dseName }, idx) => {
                      if (waUrl) setTimeout(() => window.open(waUrl, "_blank", "noopener,noreferrer"), idx * 500);
                    });
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open All on WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Console ── */}
      <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-3.5 w-3.5 text-gray-500 sm:h-4 sm:w-4" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider sm:text-xs">Debug Console</p>
        </div>
        <pre className="text-[9px] sm:text-[10px] text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto max-w-full">
{`[FOLLOWUPS] Total: ${stats.total} | Today: ${stats.today} | Overdue: ${stats.overdue} | Unseen: ${stats.unseen}
[FOLLOWUPS] Tab: ${activeTab} | DSE: ${selectedDse} | Search: "${search || "none"}"
[FOLLOWUPS] Groups: Overdue=${groupedFollowUps.overdue.length} Today=${groupedFollowUps.today.length} Tomorrow=${groupedFollowUps.tomorrow.length} Week=${groupedFollowUps.this_week.length} Future=${groupedFollowUps.future.length} Done=${groupedFollowUps.completed.length}
[WHATSAPP] Batch: ${todayCount} due today across ${batchData.length} DSEs`}
        </pre>
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: "purple" | "orange" | "red" | "blue" | "green" | "pink";
}) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", icon: "text-purple-400" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", icon: "text-orange-400" },
    red: { bg: "bg-red-500/10", text: "text-red-400", icon: "text-red-400" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400" },
    green: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "text-emerald-400" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-400", icon: "text-pink-400" },
  };
  const c = colorMap[color];
  return (
    <div className={`w-full rounded-xl border border-gray-700/50 ${c.bg} p-3`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${c.icon}`} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className={`mt-1 text-xl font-bold ${c.text}`}>{value}</p>
    </div>
  );
}

function Terminal({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}
