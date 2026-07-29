"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  PhoneCall,
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  Calendar,
  MessageSquare,
  Send,
  CheckCheck,
  X,
  RefreshCw,
  UserCheck,
  Sun,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";

import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import { formatRelativeTime, getTodayLocal } from "@/lib/time-utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buildDseWhatsAppUrl } from "@/lib/cug-phone";
import { buildDseReminderMessage, buildDseBatchMessage } from "@/lib/whatsapp";
import type { IFollowUp } from "@/lib/models/FollowUp";
import type { IUser } from "@/lib/models/User";
import type { IProspect } from "@/lib/models/Prospect";

export default function DeveloperFollowupsPage() {
  const [search, setSearch] = useState("");
  const [selectedDse, setSelectedDse] = useState<string>("all");
  const [sendingReminder, setSendingReminder] = useState<Set<string>>(new Set());
  const [reminderFeedback, setReminderFeedback] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const [expandedDse, setExpandedDse] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showBatchModal, setShowBatchModal] = useState(false);

  const { data: followUpsData, loading: loadingFollowUps, refetch: refetchFollowUps } = useApiData<{ followUps: IFollowUp[] }>(
    "/api/followups",
    { followUps: [] }
  );
  const { data: usersData, loading: loadingUsers } = useApiData<{ users: IUser[] }>(
    "/api/users",
    { users: [] }
  );
  const { data: prospectsData } = useApiData<{ prospects: IProspect[] }>(
    "/api/prospects",
    { prospects: [] }
  );

  const followUps = followUpsData.followUps;
  const users = usersData.users;

  // Build maps
  const dseSupervisorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of users) {
      if (u.role === "DSE") {
        map[u.name] = u.supervisor || "Unassigned";
      }
    }
    return map;
  }, [users]);

  // Build DSE info map (CUG suffix, phone for WhatsApp)
  const dseInfoMap = useMemo(() => {
    const map: Record<string, { cugSuffix: string; phone: string }> = {};
    for (const u of users) {
      if (u.role === "DSE") {
        map[u.name] = {
          cugSuffix: u.cugSuffix,
          phone: u.phone || "",
        };
      }
    }
    return map;
  }, [users]);

  // Group followups by DSE
  const groupedByDse = useMemo(() => {
    const groups: Record<string, IFollowUp[]> = {};
    for (const fu of followUps) {
      const dse = fu.assignedDse || "Unassigned";
      if (!groups[dse]) groups[dse] = [];
      groups[dse].push(fu);
    }
    return groups;
  }, [followUps]);

  const dseNames = useMemo(() => Object.keys(groupedByDse).sort(), [groupedByDse]);

  // Filtered followups based on search and DSE filter
  const filteredDse = useMemo(() => {
    let names = dseNames;

    if (search.trim()) {
      const q = search.toLowerCase();
      names = names.filter((name) => name.toLowerCase().includes(q));
    }

    if (selectedDse !== "all") {
      names = names.filter((n) => n === selectedDse);
    }

    return names;
  }, [dseNames, search, selectedDse]);

  // Count stats
  const stats = useMemo(() => {
    const total = followUps.length;
    const today = followUps.filter((f) => f.status === "TODAY").length;
    const overdue = followUps.filter((f) => f.status === "OVERDUE").length;
    const upcoming = followUps.filter((f) => f.status === "UPCOMING").length;
    const completed = followUps.filter((f) => f.status === "COMPLETED").length;
    const unseen = followUps.filter((f) => !f.followUpSeenAt).length;
    return { total, today, overdue, upcoming, completed, unseen };
  }, [followUps]);

  // ── Batch data: TODAY followups grouped by DSE for WhatsApp batch ──
  const batchData = useMemo(() => {
    const todayFollowups = followUps.filter((f) => f.status === "TODAY");
    const groups: Record<string, IFollowUp[]> = {};
    for (const fu of todayFollowups) {
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
        const waUrl = info?.cugSuffix
          ? buildDseWhatsAppUrl(info.cugSuffix, message)
          : null;
        return { dseName, count: items.length, message, waUrl, items };
      })
      .sort((a, b) => b.count - a.count);
  }, [followUps, dseInfoMap]);

  const todayCount = batchData.reduce((sum, d) => sum + d.count, 0);

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
    const url = buildDseWhatsAppUrl(cugSuffix, message);
    window.open(url, "_blank", "noopener,noreferrer");
    console.log(`[WHATSAPP] Opening WhatsApp for CUG ${cugSuffix}`);
    console.log(`[WHATSAPP] Message: "${message.substring(0, 60)}..."`);
  }, []);

  const toggleDse = (name: string) => {
    setExpandedDse((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Count by status for a specific DSE
  const dseStatusCounts = (dse: string) => {
    const items = groupedByDse[dse] || [];
    return {
      today: items.filter((f) => f.status === "TODAY").length,
      overdue: items.filter((f) => f.status === "OVERDUE").length,
      upcoming: items.filter((f) => f.status === "UPCOMING").length,
      completed: items.filter((f) => f.status === "COMPLETED").length,
      unseen: items.filter((f) => !f.followUpSeenAt).length,
      total: items.length,
    };
  };

  const getFilteredFollowupsForDse = (dse: string) => {
    let items = groupedByDse[dse] || [];
    if (statusFilter !== "all") {
      items = items.filter((f) => f.status === statusFilter);
    }
    return items;
  };

  return (
    <div className="max-w-full overflow-x-hidden space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <PhoneCall className="h-4 w-4 shrink-0 text-purple-400 sm:h-5 sm:w-5" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate sm:text-xl">Follow-ups Overview</h2>
            <p className="mt-0.5 text-xs text-gray-400 truncate sm:text-sm">
              All follow-ups across every DSE — send reminders, WhatsApp, and track acknowledgment.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Send Today's Batch button */}
          {todayCount > 0 && (
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-500/20 sm:px-3 sm:py-2 sm:text-xs sm:gap-2"
            >
              <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Send Today&apos;s Batch</span>
              <span className="sm:hidden">Batch</span>
              <span>({todayCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => refetchFollowUps()}
            className="flex items-center gap-1 rounded-xl border border-gray-700 bg-[#252550] px-2 py-1.5 text-[10px] text-gray-300 transition hover:bg-[#2f2f60] sm:px-3 sm:py-2 sm:text-xs"
          >
            <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
        <StatBox icon={PhoneCall} label="Total" value={String(stats.total)} color="purple" />
        <StatBox icon={Clock} label="Today" value={String(stats.today)} color="orange" />
        <StatBox icon={AlertTriangle} label="Overdue" value={String(stats.overdue)} color="red" />
        <StatBox icon={Calendar} label="Upcoming" value={String(stats.upcoming)} color="blue" />
        <StatBox icon={CheckCircle2} label="Done" value={String(stats.completed)} color="green" />
        <StatBox icon={UserCheck} label="Unseen" value={String(stats.unseen)} color="pink" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 sm:left-4 sm:h-4 sm:w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search DSE..."
            className="h-10 w-full rounded-xl border border-gray-700/50 bg-[#1a1a3e] pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 sm:h-11 sm:pl-10 sm:pr-4 sm:text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedDse}
            onChange={(e) => setSelectedDse(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-gray-700/50 bg-[#1a1a3e] px-3 text-xs text-gray-200 outline-none transition focus:border-purple-500/50 sm:h-11 sm:px-4 sm:text-sm"
          >
            <option value="all">All DSEs</option>
            {dseNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-gray-700/50 bg-[#1a1a3e] px-3 text-xs text-gray-200 outline-none transition focus:border-purple-500/50 sm:h-11 sm:px-4 sm:text-sm"
          >
            <option value="all">All</option>
            <option value="TODAY">Today</option>
            <option value="OVERDUE">Overdue</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="COMPLETED">Done</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loadingFollowUps || loadingUsers ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-500" />
        </div>
      ) : filteredDse.length > 0 ? (
        <div className="space-y-4">
          {filteredDse.map((dseName) => {
            const counts = dseStatusCounts(dseName);
            const supervisor = dseSupervisorMap[dseName] || "Unassigned";
            const dseInfo = dseInfoMap[dseName];
            return (
              <div
                key={dseName}
                className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] overflow-hidden"
              >
                {/* DSE Header (collapsible) */}
                <button
                  type="button"
                  onClick={() => toggleDse(dseName)}
                  className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-[#252550]/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                    {dseName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{dseName}</span>
                      {counts.unseen > 0 && (
                        <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-medium text-pink-400">
                          {counts.unseen} unseen
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {supervisor}
                      </span>
                      {dseInfo?.cugSuffix && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span>CUG: {dseInfo.cugSuffix}</span>
                        </>
                      )}
                      <span className="text-gray-600">·</span>
                      <span>{counts.total} follow-ups</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {counts.today > 0 && (
                      <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                        {counts.today} today
                      </span>
                    )}
                    {counts.overdue > 0 && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
                        {counts.overdue} overdue
                      </span>
                    )}
                    {expandedDse[dseName] ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded follow-ups list */}
                {expandedDse[dseName] && (
                  <div className="border-t border-gray-700/50 px-4 pb-4 pt-3">
                    {getFilteredFollowupsForDse(dseName).length > 0 ? (
                      <div className="space-y-2">
                        {getFilteredFollowupsForDse(dseName).map((fu) => {
                          const fuId = String(fu._id);
                          const prospectName = fu.customerName;
                          const isSending = sendingReminder.has(fuId);
                          const feedback = reminderFeedback?.id === fuId ? reminderFeedback : null;
                          const isSeen = !!fu.followUpSeenAt;

                          return (
                            <div
                              key={fuId}
                              className={`rounded-xl border p-3 transition ${
                                fu.status === "TODAY"
                                  ? "border-orange-500/30 bg-orange-500/5"
                                  : fu.status === "OVERDUE"
                                  ? "border-red-500/30 bg-red-500/5"
                                  : fu.status === "COMPLETED"
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : "border-gray-700/50 bg-[#252550]/50"
                              }`}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-semibold text-white truncate">
                                      {prospectName}
                                    </h4>
                                    <StatusBadge status={fu.status} />
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Due: {fu.expectedPurchaseDate}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      {fu.category}
                                    </span>
                                    {isSeen ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-400">
                                        <CheckCheck className="h-3 w-3" />
                                        Seen {formatRelativeTime(fu.followUpSeenAt)}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-gray-500">
                                        <X className="h-3 w-3" />
                                        Not acknowledged
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-row items-center gap-1.5 sm:flex-col sm:items-end">
                                  {/* Send Reminder button */}
                                  <button
                                    type="button"
                                    onClick={() => handleSendReminder(fuId)}
                                    disabled={isSending}
                                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                                      isSeen
                                        ? "border border-gray-700 bg-[#252550] text-gray-300 hover:bg-[#2f2f60]"
                                        : "border border-orange-500/40 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25"
                                    }`}
                                    title={isSeen ? "Send reminder anyway" : "Send reminder to DSE"}
                                  >
                                    {isSending ? (
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
                                          prospectName,
                                          status: fu.status,
                                          dueDate: fu.expectedPurchaseDate,
                                        });
                                        handleWhatsAppDse(dseInfo.cugSuffix, msg);
                                      }}
                                      className="flex items-center gap-1.5 rounded-xl border border-green-700/40 bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/20"
                                      title="Send WhatsApp reminder to DSE"
                                    >
                                      <FaWhatsapp className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  {feedback && (
                                    <span className={`text-[10px] ${feedback.ok ? "text-emerald-400" : "text-red-400"} hidden sm:block`}>
                                      {feedback.message}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {feedback && (
                                <span className={`mt-1 block text-[10px] sm:hidden ${feedback.ok ? "text-emerald-400" : "text-red-400"}`}>
                                  {feedback.message}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-gray-500">
                        No follow-ups match the current filter.
                      </p>
                    )}
                  </div>
                )}
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
            {/* Header */}
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

            {/* Batch list */}
            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-4">
              {batchData.length > 0 ? (
                batchData.map(({ dseName, count, message, waUrl, items }) => (
                  <div
                    key={dseName}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                          {dseName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{dseName}</p>
                          <p className="text-xs text-gray-400">
                            {count} follow-up{count !== 1 ? "s" : ""} due today
                          </p>
                        </div>
                      </div>
                      {waUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            window.open(waUrl, "_blank", "noopener,noreferrer");
                            console.log(`[BATCH] Opened WhatsApp for ${dseName} (CUG: ${dseInfoMap[dseName]?.cugSuffix})`);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700"
                        >
                          <FaWhatsapp className="h-3.5 w-3.5" />
                          Send on WhatsApp
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500">No CUG on file</span>
                      )}
                    </div>

                    {/* Preview of prospects in this batch */}
                    <div className="space-y-1">
                      {items.map((fu) => (
                        <div key={String(fu._id)} className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                          <span className="text-xs text-gray-300">{fu.customerName}</span>
                          <span className="text-[10px] text-gray-500">Due: {fu.expectedPurchaseDate}</span>
                        </div>
                      ))}
                    </div>

                    {/* Message preview (collapsed) */}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-300">
        Preview message
      </summary>
                        <pre className="mt-1 rounded-lg bg-black/30 p-2 text-[10px] text-gray-400 font-mono whitespace-pre-wrap">
                          {message}
                        </pre>
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

            {/* Footer with send-all button */}
            <div className="border-t border-gray-700/50 px-5 py-3">
              <p className="text-[10px] text-gray-500 mb-2">
                Tip: Click each DSE&apos;s WhatsApp button to open their chat with the pre-filled message. Press Send in WhatsApp to deliver.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    // Open all WhatsApp links in sequence (browser may block some)
                    batchData.forEach(({ waUrl, dseName }, idx) => {
                      if (waUrl) {
                        setTimeout(() => {
                          window.open(waUrl, "_blank", "noopener,noreferrer");
                          console.log(`[BATCH] #${idx + 1} Opening WhatsApp for ${dseName}`);
                        }, idx * 500);
                      }
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

      {/* Console summary */}
      <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Debug Console</p>
        </div>
        <pre className="text-[9px] sm:text-[10px] text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto max-w-full">
{`[FOLLOWUPS] Total: ${stats.total} | Today: ${stats.today} | Overdue: ${stats.overdue} | Unseen: ${stats.unseen}
[FOLLOWUPS] DSEs with follow-ups: ${dseNames.length}
[FOLLOWUPS] Active filters: status=${statusFilter} | dse=${selectedDse} | search="${search || "none"}"
[WHATSAPP] Batch: ${todayCount} due today across ${batchData.length} DSEs`}
        </pre>
      </div>
    </div>
  );
}

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
    <div className={`rounded-xl border border-gray-700/50 ${c.bg} p-3`}>
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
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}
