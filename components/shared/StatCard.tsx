import { CalendarDays, CircleDollarSign, Target, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  className?: string;
}

const iconMap: Record<string, typeof TrendingUp> = {
  "Today's Sales": TrendingUp,
  "Weekly Sales": CalendarDays,
  "Monthly Sales": CircleDollarSign,
  "Target Progress": Target,
};

export function StatCard({ label, value, hint, accent = "#E60012", className }: StatCardProps) {
  const Icon = iconMap[label] ?? TrendingUp;

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-gray-500">{hint}</p> : null}
    </div>
  );
}
