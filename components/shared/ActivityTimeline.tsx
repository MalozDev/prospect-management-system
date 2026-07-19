"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Clock, PhoneCall, UserPlus, RefreshCw, XCircle, MapPin } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { formatRelativeTime } from "@/lib/time-utils";
import { cn } from "@/lib/utils";

interface ActivityPreview {
  _id?: unknown;
  id?: string;
  title: string;
  detail: string;
  time: string;
  type: string;
}

interface ActivityTimelineProps {
  activities: ActivityPreview[];
  compact?: boolean;
  filterable?: boolean;
}

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; label: string }> = {
  prospect:  { icon: UserPlus,     bg: "bg-blue-50",      text: "text-blue-600",    label: "Prospect" },
  followup:  { icon: RefreshCw,    bg: "bg-amber-50",     text: "text-amber-700",   label: "Follow-up" },
  call:      { icon: PhoneCall,    bg: "bg-purple-50",    text: "text-purple-700",  label: "Call" },
  whatsapp:  { icon: FaWhatsapp,   bg: "bg-green-50",     text: "text-green-600",   label: "WhatsApp" },
  visit:     { icon: MapPin,       bg: "bg-cyan-50",      text: "text-cyan-700",    label: "Visit" },
  sale:      { icon: CheckCircle2, bg: "bg-emerald-50",   text: "text-emerald-700", label: "Sale" },
  lost:      { icon: XCircle,      bg: "bg-gray-100",     text: "text-gray-500",    label: "Lost" },
};

const filterOrder = ["prospect", "followup", "call", "whatsapp", "visit", "sale", "lost"];

export function ActivityTimeline({ activities, compact = false, filterable = false }: ActivityTimelineProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(filterOrder));

  const toggleFilter = (type: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredActivities = useMemo(
    () => (filterable ? activities.filter((a) => activeFilters.has(a.type)) : activities),
    [activities, activeFilters, filterable]
  );

  // Count activities by type
  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of activities) {
      counts[a.type] = (counts[a.type] ?? 0) + 1;
    }
    return counts;
  }, [activities]);

  return (
    <div>
      {/* ── Filter bar ── */}
      {filterable && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {filterOrder.map((type) => {
            const cfg = typeConfig[type];
            if (!cfg) return null;
            const active = activeFilters.has(type);
            const count = countByType[type] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleFilter(type)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition sm:text-xs",
                  active
                    ? `${cfg.bg} ${cfg.text} border-transparent`
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                )}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
                <span className={active ? "" : "text-gray-300"}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Activity list ── */}
      <div className={compact ? "space-y-2" : "space-y-4"}>
        {filteredActivities.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No activities to show.</p>
        ) : (
          filteredActivities.map((activity) => {
            const cfg = typeConfig[activity.type] ?? typeConfig.prospect;
            const Icon = cfg.icon;

            return (
              <div
                key={String(activity._id ?? activity.id ?? activity.title)}
                className={
                  compact
                    ? "rounded-2xl border border-gray-100 bg-gray-50 p-3"
                    : "rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
                }
              >
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center",
                      compact ? "h-8 w-8 rounded-xl" : "mt-1 h-10 w-10 rounded-2xl",
                      cfg.bg,
                      cfg.text
                    )}
                  >
                    <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={compact ? "text-sm font-semibold text-gray-900" : "font-semibold text-gray-900"}>
                        {activity.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-400 sm:text-xs">
                        {formatRelativeTime(activity.time)}
                      </span>
                    </div>
                    <p className={compact ? "mt-1 text-xs text-gray-600" : "mt-2 text-sm text-gray-600"}>
                      {activity.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
