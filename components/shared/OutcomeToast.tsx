"use client";

import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle2, ThumbsDown, CalendarDays, MapPin, PartyPopper } from "lucide-react";

export type OutcomeType = "sold" | "lost" | "postpone" | "schedule_visit";

interface OutcomeToastProps {
  type: OutcomeType;
  customerName: string;
  /** Optional detail like date or package name */
  detail?: string;
  /** Auto-dismiss timeout in ms (default: 5000) */
  duration?: number;
  onDismiss: () => void;
}

const outcomeConfig: Record<OutcomeType, {
  icon: React.ReactNode;
  title: string;
  bgClass: string;
  borderClass: string;
  iconBgClass: string;
  iconColorClass: string;
}> = {
  sold: {
    icon: <PartyPopper className="h-6 w-6" />,
    title: "Sale Closed!",
    bgClass: "bg-gradient-to-r from-emerald-50 to-green-50",
    borderClass: "border-emerald-300",
    iconBgClass: "bg-emerald-500",
    iconColorClass: "text-white",
  },
  lost: {
    icon: <ThumbsDown className="h-6 w-6" />,
    title: "Prospect Lost",
    bgClass: "bg-gradient-to-r from-red-50 to-rose-50",
    borderClass: "border-red-300",
    iconBgClass: "bg-red-500",
    iconColorClass: "text-white",
  },
  postpone: {
    icon: <CalendarDays className="h-6 w-6" />,
    title: "Follow-up Postponed",
    bgClass: "bg-gradient-to-r from-amber-50 to-yellow-50",
    borderClass: "border-amber-300",
    iconBgClass: "bg-amber-500",
    iconColorClass: "text-white",
  },
  schedule_visit: {
    icon: <MapPin className="h-6 w-6" />,
    title: "Visit Scheduled",
    bgClass: "bg-gradient-to-r from-blue-50 to-sky-50",
    borderClass: "border-blue-300",
    iconBgClass: "bg-blue-500",
    iconColorClass: "text-white",
  },
};

export function OutcomeToast({
  type,
  customerName,
  detail,
  duration = 5000,
  onDismiss,
}: OutcomeToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const config = outcomeConfig[type];
  const customerLabel = customerName || "this prospect";

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onDismiss(), 300);
  }, [exiting, onDismiss]);

  // Auto-dismiss on timer
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  const actionMessages: Record<OutcomeType, string[]> = {
    sold: [
      `You closed a deal with ${customerLabel}!`,
      "Great job — keep the momentum going!",
    ],
    lost: [
      `${customerLabel} marked as lost.`,
      "Don't worry — every 'no' brings you closer to a 'yes'.",
    ],
    postpone: [
      `Follow-up with ${customerLabel} postponed.`,
      detail ? `New date: ${detail}` : "You'll get back to them soon.",
    ],
    schedule_visit: [
      `Visit scheduled with ${customerLabel}.`,
      detail ? `Date: ${detail}` : "Make sure to prepare well!",
    ],
  };

  const messages = actionMessages[type];

  return (
    <div
      className={`fixed top-6 left-1/2 z-[99999] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-all duration-300 ease-out ${
        visible && !exiting
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-3xl border-2 shadow-2xl ${config.borderClass} ${config.bgClass}`}
      >
        {/* Decorative top bar */}
        <div className={`h-1.5 w-full ${config.iconBgClass}`} />

        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${config.iconBgClass}`}
            >
              <div className={config.iconColorClass}>{config.icon}</div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-1">
              <h3 className="text-lg font-bold text-gray-900">{config.title}</h3>
              {messages.map((msg, i) => (
                <p key={i} className={`text-sm ${i === 0 ? "mt-1 font-medium text-gray-700" : "mt-0.5 text-gray-500"}`}>
                  {msg}
                </p>
              ))}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/60 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action button */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 ${config.iconBgClass}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
