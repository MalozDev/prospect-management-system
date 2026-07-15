import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  className?: string;
}

export function StatCard({ label, value, hint, accent = "#E60012", className }: StatCardProps) {
  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-gray-500">{hint}</p> : null}
    </div>
  );
}
