import { CheckCircle2, Clock, PhoneCall, MessageCircle, UserPlus, RefreshCw } from "lucide-react";
import type { ActivityItem } from "@/lib/mock-data";

interface ActivityTimelineProps {
  activities: ActivityItem[];
  compact?: boolean;
}

const iconMap: Record<string, typeof CheckCircle2> = {
  prospect: UserPlus,
  followup: RefreshCw,
  call: PhoneCall,
  whatsapp: MessageCircle,
  visit: Clock,
  sale: CheckCircle2,
  lost: CheckCircle2,
};

export function ActivityTimeline({ activities, compact = false }: ActivityTimelineProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {activities.map((activity) => {
        const Icon = iconMap[activity.type] ?? CheckCircle2;

        return (
          <div
            key={activity.id}
            className={
              compact
                ? "rounded-2xl border border-gray-100 bg-gray-50 p-3"
                : "rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
            }
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div
                className={
                  compact
                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fff1f1] text-[#E60012]"
                    : "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1f1] text-[#E60012]"
                }
              >
                <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={compact ? "text-sm font-semibold text-gray-900" : "font-semibold text-gray-900"}>
                    {activity.title}
                  </p>
                  <span className="shrink-0 text-[10px] text-gray-400 sm:text-xs">{activity.time}</span>
                </div>
                <p className={compact ? "mt-1 text-xs text-gray-600" : "mt-2 text-sm text-gray-600"}>
                  {activity.detail}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
