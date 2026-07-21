"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import type { IFollowUp } from "@/lib/models/FollowUp";
import {
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  CalendarDays,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  ChevronRight,
  X,
  Loader2,
  StickyNote,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import { getStoredProfile } from "@/utils/profile";
import { OutcomeToast, type OutcomeType } from "@/components/shared/OutcomeToast";

// Feedback modal state
type FeedbackAction = "sold" | "lost" | "schedule_visit" | "postpone" | null;

function getOrdinal(day: number) {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const ordinal = getOrdinal(day);
  return `${date.toLocaleString("en-US", { month: "long" })} ${day}${ordinal}, ${date.getFullYear()}`;
}

function formatDateForMessage(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateShort(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isToday(dateStr: string) {
  const d = new Date();
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dateStr === todayLocal;
}

export default function FollowUpsPage() {
  const [showFuture, setShowFuture] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<IFollowUp | null>(null);
  const [feedbackAction, setFeedbackAction] = useState<FeedbackAction>(null);
  const [visitDate, setVisitDate] = useState("");
  const [postponeDate, setPostponeDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showFeedback, setShowFeedback] = useState(true);
  const [feedbackCollapsed, setFeedbackCollapsed] = useState(false);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [contactError, setContactError] = useState("");
  const [outcomeToast, setOutcomeToast] = useState<{
    type: OutcomeType;
    customerName: string;
    detail?: string;
  } | null>(null);
  const futureSectionRef = useRef<HTMLDivElement | null>(null);

  const { data, refetch } = useApiData<{ followUps: IFollowUp[] }>("/api/followups", { followUps: [] });
  const profile = useMemo(() => getStoredProfile(), []);
  const dseName = profile.name;

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Categorize follow-ups
  const todayItems = useMemo(
    () => data.followUps.filter(
      (item) => (item.status === "TODAY" || item.status === "OVERDUE") &&
        item.outcome !== "SOLD" &&
        item.outcome !== "LOST"
    ),
    [data.followUps]
  );

  const pendingReviewItems = useMemo(
    () => data.followUps.filter((item) => item.outcome === "PENDING_REVIEW"),
    [data.followUps]
  );

  const futureItems = useMemo(
    () => data.followUps.filter(
      (item) => item.status === "UPCOMING" &&
        item.outcome !== "SOLD" &&
        item.outcome !== "LOST" &&
        item.outcome !== "PENDING_REVIEW"
    ),
    [data.followUps]
  );

  const completedItems = useMemo(
    () => data.followUps.filter(
      (item) => item.outcome === "SOLD" || item.outcome === "LOST"
    ).slice(0, 5),
    [data.followUps]
  );

  const futureGroups = useMemo(() => {
    return futureItems.reduce((groups, item) => {
      const date = item.expectedPurchaseDate;
      groups[date] = groups[date] ?? [];
      groups[date].push(item);
      return groups;
    }, {} as Record<string, IFollowUp[]>);
  }, [futureItems]);

  const sortedFutureDates = useMemo(
    () => Object.keys(futureGroups).sort((a, b) => a.localeCompare(b)),
    [futureGroups]
  );

  // Check for pending review items on load (only if no explicit contact is pending)
  useEffect(() => {
    if (pendingReviewItems.length > 0 && showFeedback && !pendingContactId) {
      // Auto-show feedback for first pending review item
      setFeedbackItem(pendingReviewItems[0]);
    }
  }, [pendingReviewItems, showFeedback, pendingContactId]);

  useEffect(() => {
    if (showFuture && futureSectionRef.current) {
      futureSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showFuture]);

  const handleContacted = useCallback(async (id: string, item: IFollowUp) => {
    // If there's already a pending contact, refuse until feedback is given
    if (pendingContactId && pendingContactId !== id) {
      setContactError("Please provide feedback for the current prospect first.");
      setTimeout(() => setContactError(""), 4000);
      return;
    }

    // If we already have feedback showing for this item, just reopen it
    if (pendingContactId === id && feedbackItem) {
      return;
    }

    setContactError("");
    setPendingContactId(id);
    setFeedbackItem(item);
    setShowFeedback(true);
    setFeedbackCollapsed(false);
  }, [pendingContactId, feedbackItem]);

  const handleFeedbackSubmit = useCallback(async () => {
    if (!feedbackItem) return;
    const id = String(feedbackItem._id);
    setSubmitting(true);
    setError("");

    try {
      switch (feedbackAction) {
        case "sold":
          await apiFetch(`/api/followups/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "sold" }),
          });
          break;
        case "lost":
          await apiFetch(`/api/followups/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "lost" }),
          });
          break;
        case "schedule_visit":
          if (!visitDate) {
            setError("Please select a visit date.");
            setSubmitting(false);
            return;
          }
          await apiFetch(`/api/followups/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "schedule_visit", visitDate }),
          });
          break;
        case "postpone":
          if (!postponeDate) {
            setError("Please select a new follow-up date.");
            setSubmitting(false);
            return;
          }
          await apiFetch(`/api/followups/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "postpone", newDate: postponeDate }),
          });
          break;
      }
      // Show outcome popup
      if (feedbackAction && feedbackItem) {
        let detail = "";
        if (feedbackAction === "schedule_visit" && visitDate) {
          detail = formatDate(visitDate);
        } else if (feedbackAction === "postpone" && postponeDate) {
          detail = formatDate(postponeDate);
        }
        setOutcomeToast({
          type: feedbackAction,
          customerName: feedbackItem.customerName,
          detail,
        });
      }

      setFeedbackItem(null);
      setFeedbackAction(null);
      setPendingContactId(null);
      setVisitDate("");
      setPostponeDate("");
      setContactError("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }, [feedbackItem, feedbackAction, visitDate, postponeDate, refetch]);

  const dismissFeedback = useCallback(() => {
    setFeedbackItem(null);
    setFeedbackAction(null);
    setVisitDate("");
    setPostponeDate("");
    setError("");
    setShowFeedback(false);
    // Don't clear pendingContactId — user must provide feedback before contacting another
  }, []);

  const cancelPendingContact = useCallback(() => {
    setPendingContactId(null);
    setFeedbackItem(null);
    setFeedbackAction(null);
    setVisitDate("");
    setPostponeDate("");
    setError("");
    setShowFeedback(false);
    setContactError("");
  }, []);

  const getId = (item: IFollowUp) => String(item._id);

  const getContactLabel = (item: IFollowUp) => {
    if (item.category === "VISIT") return "Visit";
    if (item.category === "WHATSAPP") return "WhatsApp";
    return "Call";
  };

  return (
    <PageShell title="Follow Ups" description="Contact prospects due today, then log your outcome.">
      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}
      {contactError && (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 border border-amber-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{contactError}</span>
        </div>
      )}

      {/* Outcome Toast Popup */}
      {outcomeToast && (
        <OutcomeToast
          type={outcomeToast.type}
          customerName={outcomeToast.customerName}
          detail={outcomeToast.detail}
          onDismiss={() => setOutcomeToast(null)}
        />
      )}

      {/* Feedback Modal */}
      {feedbackItem && feedbackAction === null && (
        <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">How did it go with {feedbackItem.customerName}?</p>
                <p className="mt-1 text-sm text-gray-600">
                  You marked this follow-up as contacted. What was the outcome?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cancelPendingContact}
                className="rounded-full px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-amber-100 transition"
                title="Cancel contact attempt"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={dismissFeedback}
                className="rounded-full p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFeedbackAction("sold")}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <ThumbsUp className="h-4 w-4" /> Sold
            </button>
            <button
              type="button"
              onClick={() => setFeedbackAction("lost")}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              <ThumbsDown className="h-4 w-4" /> Lost
            </button>
            <button
              type="button"
              onClick={() => setFeedbackAction("schedule_visit")}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
            >
              <MapPin className="h-4 w-4" /> Schedule Visit
            </button>
            <button
              type="button"
              onClick={() => setFeedbackAction("postpone")}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <CalendarDays className="h-4 w-4" /> Postpone
            </button>
          </div>
        </div>
      )}

      {/* Feedback action forms */}
      {feedbackItem && feedbackAction === "sold" && (
        <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">Confirm sale for {feedbackItem.customerName}</p>
              <p className="mt-1 text-sm text-gray-600">A sale record will be created and this prospect will be marked as sold.</p>
            </div>
            <button type="button" onClick={dismissFeedback} className="rounded-full p-1 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Sale
            </button>
            <button
              type="button"
              onClick={() => setFeedbackAction(null)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {feedbackItem && feedbackAction === "lost" && (
        <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">Mark {feedbackItem.customerName} as lost?</p>
              <p className="mt-1 text-sm text-gray-600">This will archive the prospect from active follow-ups.</p>
            </div>
            <button type="button" onClick={dismissFeedback} className="rounded-full p-1 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
              Mark as Lost
            </button>
            <button
              type="button"
              onClick={() => setFeedbackAction(null)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {feedbackItem && feedbackAction === "schedule_visit" && (
        <div className="mb-4 rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">Schedule a visit with {feedbackItem.customerName}</p>
              <p className="mt-1 text-sm text-gray-600">Pick a date for the in-person visit.</p>
            </div>
            <button type="button" onClick={dismissFeedback} className="rounded-full p-1 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Visit date</label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              min={today}
              className="w-full max-w-xs rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={submitting || !visitDate}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Schedule Visit
            </button>
            <button
              type="button"
              onClick={() => setFeedbackAction(null)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {feedbackItem && feedbackAction === "postpone" && (
        <div className="mb-4 rounded-3xl border border-gray-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">Postpone follow-up for {feedbackItem.customerName}</p>
              <p className="mt-1 text-sm text-gray-600">Set a new date to follow up with this prospect.</p>
            </div>
            <button type="button" onClick={dismissFeedback} className="rounded-full p-1 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">New follow-up date</label>
            <input
              type="date"
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
              min={today}
              className="w-full max-w-xs rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#E60012] focus:ring-2 focus:ring-red-200"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={submitting || !postponeDate}
              className="inline-flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              Postpone
            </button>
            <button
              type="button"
              onClick={() => setFeedbackAction(null)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900">Today&rsquo;s action list</p>
          <p className="text-xs text-gray-500">
            {todayItems.length} active · {pendingReviewItems.length} pending review · {futureItems.length} upcoming
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFuture((value) => !value)}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
        >
          {showFuture ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showFuture ? "Hide future" : "Future"}
        </button>
      </div>

      <div className="grid gap-4">
        {/* Pending Review Items — collapsible with Done button */}
        {pendingReviewItems.length > 0 && !showFeedback && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-gray-900">
                  {feedbackCollapsed ? (
                    <>{pendingReviewItems.length} follow-up{pendingReviewItems.length !== 1 ? "s" : ""} need feedback</>
                  ) : (
                    <>{pendingReviewItems.length} follow-up{pendingReviewItems.length !== 1 ? "s" : ""} need your feedback</>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackCollapsed((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  feedbackCollapsed
                    ? "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
                    : "bg-amber-200 text-amber-800 hover:bg-amber-300"
                }`}
              >
                {feedbackCollapsed ? (
                  <><ChevronDown className="h-3.5 w-3.5" /> View</>
                ) : (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Done</>
                )}
              </button>
            </div>
            {!feedbackCollapsed && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingReviewItems.slice(0, 5).map((item) => (
                  <button
                    key={String(item._id)}
                    type="button"
                    onClick={() => { setFeedbackItem(item); setShowFeedback(true); }}
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-amber-300 hover:shadow-sm"
                  >
                    {item.customerName} <ChevronRight className="ml-1 inline h-3 w-3" />
                  </button>
                ))}
                {pendingReviewItems.length > 5 && (
                  <p className="flex items-center text-xs text-gray-500 px-2">
                    +{pendingReviewItems.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Today's Action Items */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#E60012]" />
              <p className="text-sm font-semibold text-gray-900">Due now</p>
            </div>
            <p className="text-xs text-gray-500">{todayItems.length} prospect{todayItems.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {todayItems.length > 0 ? (
          todayItems.map((item) => (
            <div
              key={String(item._id)}
              className={`rounded-3xl border p-4 shadow-sm transition ${
                item.category === "VISIT"
                  ? "border-blue-200 bg-blue-50/30"
                  : item.status === "OVERDUE"
                  ? "border-red-200 bg-red-50/30"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{item.customerName}</h3>
                    <StatusBadge status={item.status} />
                    {item.category === "VISIT" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        <MapPin className="h-3 w-3" /> Visit
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                    <span>{item.phone}</span>
                    {item.visitDate && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <CalendarDays className="h-3.5 w-3.5" /> Visit: {formatDateShort(item.visitDate)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Expected purchase: {formatDate(item.expectedPurchaseDate)}
                  </p>
                  {item.notes?.trim() && (
                    <p className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span>{item.notes}</span>
                    </p>
                  )}
                  {item.lastContacted && (
                    <p className="mt-1 text-xs text-gray-400">Last contacted: {item.lastContacted}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Contact buttons */}
                  <a
                    href={`tel:${item.phone}`}
                    className="rounded-full border border-gray-200 bg-white p-2.5 text-[#E60012] transition hover:bg-red-50 hover:border-red-200"
                    aria-label={`Call ${item.customerName}`}
                    title="Call"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                  <a
                    href={buildWhatsAppUrl(item.phone, buildWhatsAppMessage({ customerName: item.customerName, dseName, date: formatDateForMessage(item.expectedPurchaseDate), notes: item.notes }))}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-gray-200 bg-white p-2.5 text-green-600 transition hover:bg-green-50 hover:border-green-200"
                    aria-label={`WhatsApp ${item.customerName}`}
                    title="WhatsApp"
                  >
                    <FaWhatsapp className="h-4 w-4" />
                  </a>

                  {/* Mark Contacted button */}
                  {pendingContactId === String(item._id) ? (
                    <button
                      type="button"
                      onClick={() => handleContacted(String(item._id), item)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Give Feedback
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleContacted(String(item._id), item)}
                      disabled={actionLoading === String(item._id) || (!!pendingContactId && pendingContactId !== String(item._id))}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                        pendingContactId
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-[#E60012] hover:bg-red-700"
                      }`}
                    >
                      {actionLoading === String(item._id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {item.category === "VISIT" ? "Visited" : "Contacted"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            {pendingReviewItems.length > 0 ? (
              <p>All active follow-ups are awaiting your feedback. Check the pending section above.</p>
            ) : (
              <p>No follow-ups due today. Great work staying on top of things!</p>
            )}
          </div>
        )}

        {/* Future Section */}
        {showFuture && (
          <div ref={futureSectionRef} className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Future follow-ups</p>
                  <p className="text-xs text-gray-500">{futureItems.length} prospect{futureItems.length === 1 ? "" : "s"} on upcoming dates</p>
                </div>
              </div>
            </div>

            {sortedFutureDates.length > 0 ? (
              sortedFutureDates.map((date) => (
                <div key={date} className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDates((value) => ({ ...value, [date]: !value[date] }))
                    }
                    className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {isToday(date) ? "Today" : formatDate(date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {futureGroups[date].length} prospect{futureGroups[date].length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#E60012]">
                        {expandedDates[date] ? "Hide" : "View"}
                      </span>
                    </div>
                  </button>
                  {expandedDates[date] && (
                    <div className="space-y-3">
                      {futureGroups[date].map((item) => (
                        <div key={String(item._id)} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{item.customerName}</h3>
                                <StatusBadge status={item.status} />
                                {item.category === "VISIT" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                    Visit
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-500">{item.phone}</p>
                              <p className="mt-1 text-sm text-gray-600">
                                Expected purchase: {formatDate(item.expectedPurchaseDate)}
                              </p>
                              {item.notes?.trim() && (
                                <p className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
                                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                                  <span>{item.notes}</span>
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`tel:${item.phone}`}
                                className="rounded-full border border-gray-200 p-2 text-[#E60012] transition hover:bg-red-50"
                                aria-label={`Call ${item.customerName}`}
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                              <a
                              href={buildWhatsAppUrl(item.phone, buildWhatsAppMessage({ customerName: item.customerName, dseName, date: formatDateForMessage(item.expectedPurchaseDate), notes: item.notes }))}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-gray-200 p-2 text-green-600 transition hover:bg-green-50"
                              aria-label={`WhatsApp ${item.customerName}`}
                            >
                              <FaWhatsapp className="h-4 w-4" />
                            </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No upcoming follow-ups scheduled.
              </div>
            )}
          </div>
        )}

        {/* Toggle future button */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 text-right shadow-sm">
          <button
            type="button"
            onClick={() => setShowFuture((value) => !value)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#E60012] hover:text-[#E60012]"
          >
            {showFuture ? "Hide future prospects" : "View future prospects"}
          </button>
        </div>
      </div>

      {/* Completed outcomes summary */}
      {completedItems.length > 0 && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Recent outcomes ({completedItems.length})</h3>
          </div>
          <div className="mt-3 grid gap-2">
            {completedItems.map((item) => (
              <div key={String(item._id)} className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-900">{item.customerName}</span>
                <span className={`font-medium ${
                  item.outcome === "SOLD" ? "text-emerald-600" : "text-red-500"
                }`}>
                  {item.outcome === "SOLD" ? "✓ Sold" : "✗ Lost"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
