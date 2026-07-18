"use client";

import Link from "next/link";
import { Bell, LayoutDashboard, LogOut, Settings, ShoppingCart, UserRound, Users2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearToken } from "@/lib/api-client";
import { getProfileInitials, getStoredProfile, type ProfileInfo, DEFAULT_PROFILE } from "@/utils/profile";

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
  { href: "/supervisor/prospects", label: "All Prospects", icon: Users2 },
  { href: "/supervisor/sales", label: "All Sales", icon: ShoppingCart },
  { href: "/supervisor/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);

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

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("crm-profile");
    router.push("/login");
  };

  const initials = getProfileInitials(profile.name);
  const isSupervisor = profile.role.toLowerCase().includes("supervisor");
  const items = isSupervisor ? supervisorItems : dseItems;

  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-gray-200 bg-white p-6 md:flex">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E60012]">Airtel Prospect Manager</p>
        <p className="mt-2 text-sm text-gray-500">
          {isSupervisor ? "Supervisor CRM" : "Direct Sales Executive CRM"}
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fff8f8] p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E60012] text-sm font-semibold text-white">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
          <p className="text-xs text-gray-500">{profile.role}</p>
        </div>
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
        <p className="mt-1 text-sm text-gray-500">
          {isSupervisor ? "Contact IT support helpdesk." : "Contact your supervisor for help."}
        </p>
        <button 
          onClick={handleLogout}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#E60012] px-3 py-2 text-sm font-medium text-white hover:bg-red-700 w-full justify-center"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

