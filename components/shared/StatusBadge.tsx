import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const toneMap: Record<string, string> = {
  NEW: "bg-[#fff1f1] text-[#E60012]",
  CONTACTED: "bg-[#eff6ff] text-[#2563eb]",
  POSTPONED: "bg-[#fef3c7] text-[#92400e]",
  SCHEDULEVISIT: "bg-[#e0f2fe] text-[#075985]",
  "FOLLOW UP": "bg-[#fef3c7] text-[#92400e]",
  "VISIT SCHEDULED": "bg-[#e0f2fe] text-[#075985]",
  ONSITE: "bg-[#ecfccb] text-[#3f6212]",
  SOLD: "bg-[#dcfce7] text-[#166534]",
  LOST: "bg-[#f3f4f6] text-[#374151]",
  TODAY: "bg-[#fff1f1] text-[#E60012]",
  UPCOMING: "bg-[#e0f2fe] text-[#075985]",
  COMPLETED: "bg-[#dcfce7] text-[#166534]",
  OVERDUE: "bg-[#fef3c7] text-[#92400e]",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", toneMap[status] ?? "bg-gray-100 text-gray-700", className)}>
      {status}
    </span>
  );
}
