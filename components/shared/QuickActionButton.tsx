import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

export function QuickActionButton({ icon: Icon, label, href }: QuickActionButtonProps) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="rounded-xl bg-[#fff1f1] p-2 text-[#E60012]">
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-medium text-gray-800">{label}</span>
    </Link>
  );
}
