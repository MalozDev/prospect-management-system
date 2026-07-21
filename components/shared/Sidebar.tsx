"use client";

import Link from "next/link";
import { Bell, ClipboardList, LayoutDashboard, Settings, ShoppingCart, UserRound, Users2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { UserDropdown } from "@/components/shared/UserDropdown";
import { getStoredProfile, type ProfileInfo, DEFAULT_PROFILE } from "@/utils/profile";
import { useUnreadCount } from "@/lib/use-unread-count";

const dseItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: Users2 },
  { href: "/followups", label: "Follow Ups", icon: UserRound },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

const supervisorItems = [
  { href: "/supervisor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/supervisor/dse", label: "DSE Team", icon: Users2 },
  { href: "/supervisor/prospects", label: "All Prospects", icon: ClipboardList },
  { href: "/supervisor/sales", label: "All Sales", icon: ShoppingCart },
  { href: "/supervisor/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);
  const unreadCount = useUnreadCount();

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setProfile(getStoredProfile());
      }
    }, 0);

    const handleProfileUpdate = () => {
      setProfile(getStoredProfile());
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const isSupervisor = profile.role.toLowerCase().includes("supervisor");
  const items = isSupervisor ? supervisorItems : dseItems;

  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-gray-200 bg-white p-6 md:flex">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E60012] to-[#CC0010]">
            <span className="text-xl font-black text-white">P</span>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#E60012]">Prospects</p>
            <p className="text-xs text-gray-500">
              {isSupervisor ? "Supervisor" : "DSE"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <UserDropdown />
      </div>

      <nav className="space-y-2">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[#fff1f1] text-[#E60012] font-semibold"
                  : "text-gray-600 hover:bg-[#fff8f8] hover:text-[#E60012]"
              }`}
            >
              <div className="relative">
                <Icon className={`h-4 w-4 ${isActive ? "text-[#E60012]" : ""}`} />
                {/* Notification badge on the Bell icon */}
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E60012] px-1 text-[8px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
              {isActive && (
                <span className="ml-auto h-2 w-2 rounded-full bg-[#E60012]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-gray-200 bg-[#fff8f8] p-4">
        <p className="text-sm font-semibold text-gray-900">Need support?</p>
        <p className="mt-1 text-sm text-gray-500">
          {isSupervisor ? "Contact IT support helpdesk." : "Contact your supervisor for help."}
        </p>
      </div>
    </aside>
  );
}

