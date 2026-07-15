import Link from "next/link";
import { Bell, LayoutDashboard, LogOut, Settings, ShoppingCart, UserRound, Users2 } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: Users2 },
  { href: "/followups", label: "Follow Ups", icon: UserRound },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-gray-200 bg-white p-6 md:flex">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E60012]">Airtel Prospect Manager</p>
        <p className="mt-2 text-sm text-gray-500">Direct Sales Executive CRM</p>
      </div>

      <nav className="space-y-2">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 transition hover:bg-[#fff1f1] hover:text-[#E60012]">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-gray-200 bg-[#fff8f8] p-4">
        <p className="text-sm font-semibold text-gray-900">Need support?</p>
        <p className="mt-1 text-sm text-gray-500">Contact your supervisor for help.</p>
        <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#E60012] px-3 py-2 text-sm font-medium text-white">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
