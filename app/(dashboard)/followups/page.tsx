"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { followUps, type FollowUp } from "@/lib/mock-data";
import { Phone, MessageCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

type Outcome = "SOLD" | "LOST";

function getFollowUpLabel(item: FollowUp) {
  if (item.isFirstFollowUp) return "Today";
  if (item.status === "OVERDUE") return item.lastContacted ?? "Overdue";
  return item.status === "TODAY" ? "Today" : "Upcoming";
}

function getOrdinal(day: number) {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatFollowUpDate(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate();
  const ordinal = getOrdinal(day);
  return `${date.toLocaleString("en-US", { month: "long" })} ${day}${ordinal}, ${date.getFullYear()}`;
}

export default function FollowUpsPage() {
  const [showFuture, setShowFuture] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const futureSectionRef = useRef<HTMLDivElement | null>(null);

  const futureItems = useMemo(
    () => followUps.filter((item) => item.status === "UPCOMING" && !outcomes[item.id]),
    [outcomes],
  );
  const todayItems = useMemo(
    () => followUps.filter((item) => (item.status === "TODAY" || item.status === "OVERDUE") && !outcomes[item.id]),
    [outcomes],
  );

  const futureGroups = useMemo(() => {
    return futureItems.reduce((groups, item) => {
      const date = item.expectedPurchaseDate;
      groups[date] = groups[date] ?? [];
      groups[date].push(item);
      return groups;
    }, {} as Record<string, FollowUp[]>);
  }, [futureItems]);

  const sortedFutureDates = useMemo(
    () => Object.keys(futureGroups).sort((a, b) => a.localeCompare(b)),
    [futureGroups],
  );

  const trackedOutcomes = useMemo(() => followUps.filter((item) => outcomes[item.id]), [outcomes]);

  useEffect(() => {
    if (showFuture && futureSectionRef.current) {
      futureSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showFuture]);

  return (
    <PageShell title="Follow Ups" description="Focus on today's prospects first, then view future work on demand.">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900">Today’s action list</p>
          <p className="text-xs text-gray-500">Only active follow-ups are shown by default.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowFuture((value) => !value)}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
        >
          {showFuture ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showFuture ? "Hide future" : "View future"}
        </button>
      </div>

      <div className="grid gap-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Today</p>
              <p className="text-xs text-gray-500">{todayItems.length} prospect{todayItems.length === 1 ? "" : "s"} to follow up</p>
            </div>
          </div>
        </div>

        {todayItems.map((item) => (
          <div key={item.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{item.customerName}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">{item.phone}</p>
                <p className="mt-1 text-sm text-gray-600">Expected purchase date: {formatFollowUpDate(item.expectedPurchaseDate)}</p>
                <p className="mt-2 text-sm font-medium text-[#E60012]">{getFollowUpLabel(item)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${item.phone}`}
                  className="rounded-full border border-gray-200 p-2 text-[#E60012]"
                  aria-label={`Call ${item.customerName}`}
                >
                  <Phone className="h-4 w-4" />
                </a>
                <a
                  href={`https://wa.me/${item.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gray-200 p-2 text-green-600"
                  aria-label={`WhatsApp ${item.customerName}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setOutcomes((value) => ({ ...value, [item.id]: "SOLD" }))}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                >
                  Sold
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomes((value) => ({ ...value, [item.id]: "LOST" }))}
                  className="rounded-full border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  Lost
                </button>
              </div>
            </div>
          </div>
        ))}

        {showFuture && (
          <div ref={futureSectionRef} className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Future follow-ups</p>
                  <p className="text-xs text-gray-500">{futureItems.length} prospect{futureItems.length === 1 ? "" : "s"} available</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-gray-200" />
            {sortedFutureDates.map((date) => (
              <div key={date} className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDates((value) => ({
                      ...value,
                      [date]: !value[date],
                    }))
                  }
                  className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatFollowUpDate(date)}</p>
                      <p className="text-xs text-gray-500">
                        {futureGroups[date].length} prospect{futureGroups[date].length === 1 ? "" : "s"} promised on this date
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#E60012]">
                      {expandedDates[date] ? "Hide" : "View"}
                    </span>
                  </div>
                </button>
                {expandedDates[date] && (
                  <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                    {futureGroups[date].map((item) => (
                      <div key={item.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{item.customerName}</h3>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{item.phone}</p>
                            <p className="mt-1 text-sm text-gray-600">Expected purchase date: {formatFollowUpDate(item.expectedPurchaseDate)}</p>
                            <p className="mt-2 text-sm font-medium text-[#E60012]">{getFollowUpLabel(item)}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`tel:${item.phone}`}
                              className="rounded-full border border-gray-200 p-2 text-[#E60012]"
                              aria-label={`Call ${item.customerName}`}
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <a
                              href={`https://wa.me/${item.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-gray-200 p-2 text-green-600"
                              aria-label={`WhatsApp ${item.customerName}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setOutcomes((value) => ({ ...value, [item.id]: "SOLD" }))}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                            >
                              Sold
                            </button>
                            <button
                              type="button"
                              onClick={() => setOutcomes((value) => ({ ...value, [item.id]: "LOST" }))}
                              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                            >
                              Lost
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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

      {trackedOutcomes.length > 0 && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#E60012]" />
            <h3 className="font-semibold text-gray-900">Tracked outcomes</h3>
          </div>
          <div className="mt-3 grid gap-2">
            {trackedOutcomes.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-900">{item.customerName}</span>
                <span className="text-gray-600">{outcomes[item.id]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
