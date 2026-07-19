"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, PhoneCall, UserPlus, RefreshCw, XCircle, MapPin } from "lucide-react";
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
  dseName?: string;
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

// Assign a consistent avatar color per DSE name
const AVATAR_COLORS = [
  { bg: "bg-red-500", ring: "ring-red-200" },
  { bg: "bg-blue-500", ring: "ring-blue-200" },
  { bg: "bg-emerald-500", ring: "ring-emerald-200" },
  { bg: "bg-purple-500", ring: "ring-purple-200" },
  { bg: "bg-amber-500", ring: "ring-amber-200" },
  { bg: "bg-cyan-500", ring: "ring-cyan-200" },
  { bg: "bg-pink-500", ring: "ring-pink-200" },
  { bg: "bg-indigo-500", ring: "ring-indigo-200" },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

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
            const avatarColor = activity.dseName ? getAvatarColor(activity.dseName) : null;
            const initials = activity.dseName ? getInitials(activity.dseName) : "";

            return (
              <div
                key={String(activity._id ?? activity.id ?? activity.title)}
                className={
                  compact
                    ? "rounded-2xl border border-gray-100 bg-gray-50 p-2.5"
                    : "rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
                }
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  {/* DSE Avatar column */}
                  {activity.dseName && (
                    <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
                      <div
                        className={cn(
                          "flex items-center justify-center rounded-full ring-2",
                          compact ? "h-7 w-7 text-[9px]" : "h-9 w-9 text-xs",
                          avatarColor?.bg ?? "bg-gray-400",
                          avatarColor?.ring ?? "ring-gray-200",
                          "text-white font-semibold"
                        )}
                      >
                        {initials}
                      </div>
                      <span className={cn(
                        "truncate text-center font-medium text-gray-400 max-w-[48px]",
                        compact ? "text-[7px] leading-tight" : "text-[8px] leading-tight"
                      )}>
                        {activity.dseName.split(/\s+/)[0]}
                      </span>
                    </div>
                  )}

                  {/* Activity icon */}
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center",
                      compact ? "h-7 w-7 rounded-xl" : "mt-0.5 h-9 w-9 rounded-2xl",
                      cfg.bg,
                      cfg.text
                    )}
                  >
                    <Icon className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={compact ? "text-sm font-semibold text-gray-900" : "font-semibold text-gray-900"}>
                        {activity.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-400 sm:text-xs">
                        {formatRelativeTime(activity.time)}
                      </span>
                    </div>
                    <p className={compact ? "mt-0.5 text-xs text-gray-600" : "mt-1 text-sm text-gray-600"}>
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
