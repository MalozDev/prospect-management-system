"use client";

import { CalendarDays, UserPlus, CheckCircle2, Phone, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProspectStatusFilter = "ALL" | "TODAY" | "PROSPECT" | "SOLD" | "CONTACT" | "LOST";

interface StatusFilterBarProps {
  value: ProspectStatusFilter;
  onChange: (value: ProspectStatusFilter) => void;
  counts: Record<ProspectStatusFilter, number>;
}

const filters: { id: ProspectStatusFilter; label: string; icon: typeof CalendarDays }[] = [
  { id: "TODAY", label: "Today", icon: CalendarDays },
  { id: "PROSPECT", label: "Prospect", icon: UserPlus },
  { id: "SOLD", label: "Sold", icon: CheckCircle2 },
  { id: "CONTACT", label: "Contact", icon: Phone },
  { id: "LOST", label: "Lost", icon: XCircle },
];

export function StatusFilterBar({ value, onChange, counts }: StatusFilterBarProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {filters.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(active ? "ALL" : id)}
            className={cn(
              "flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2.5 py-1.5 transition sm:px-3 sm:py-2",
              active
                ? "border-[#E60012] bg-[#fff1f1] text-[#E60012]"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]">{label}</span>
            <span className="text-[10px] font-bold sm:text-xs">{counts[id]}</span>
          </button>
        );
      })}
    </div>
  );
}
