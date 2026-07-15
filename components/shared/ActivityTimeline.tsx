import { CheckCircle2, Clock, PhoneCall, MessageCircle } from "lucide-react";
import type { ActivityItem } from "@/lib/mock-data";

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const iconMap: Record<string, typeof CheckCircle2> = {
  prospect: CheckCircle2,
  call: PhoneCall,
  whatsapp: MessageCircle,
  visit: Clock,
  sale: CheckCircle2,
  lost: CheckCircle2,
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = iconMap[activity.type] ?? CheckCircle2;

        return (
          <div key={activity.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff1f1] text-[#E60012]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900">{activity.title}</p>
                  <span className="text-sm text-gray-400">{activity.time}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{activity.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
