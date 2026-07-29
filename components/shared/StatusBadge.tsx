import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  dark?: boolean;
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

const darkToneMap: Record<string, string> = {
  NEW: "bg-red-500/15 text-red-300",
  CONTACTED: "bg-blue-500/15 text-blue-300",
  POSTPONED: "bg-amber-500/15 text-amber-300",
  SCHEDULEVISIT: "bg-sky-500/15 text-sky-300",
  "FOLLOW UP": "bg-amber-500/15 text-amber-300",
  "VISIT SCHEDULED": "bg-sky-500/15 text-sky-300",
  ONSITE: "bg-lime-500/15 text-lime-300",
  SOLD: "bg-emerald-500/15 text-emerald-300",
  LOST: "bg-gray-500/20 text-gray-400",
  TODAY: "bg-red-500/15 text-red-300",
  UPCOMING: "bg-sky-500/15 text-sky-300",
  COMPLETED: "bg-emerald-500/15 text-emerald-300",
  OVERDUE: "bg-amber-500/15 text-amber-300",
};

export function StatusBadge({ status, className, dark }: StatusBadgeProps) {
  const map = dark ? darkToneMap : toneMap;
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", map[status] ?? (dark ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"), className)}>
      {status}
    </span>
  );
}
