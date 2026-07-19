"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, PhoneCall, Receipt, UserCircle2, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { getStoredProfile, type ProfileInfo, DEFAULT_PROFILE } from "@/utils/profile";

const dseItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/prospects", label: "Prospects", icon: ClipboardList },
  { href: "/followups", label: "Follow Ups", icon: PhoneCall },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

const supervisorItems = [
  { href: "/supervisor/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/supervisor/dse", label: "DSE Team", icon: Users },
  { href: "/supervisor/prospects", label: "Prospects", icon: ClipboardList },
  { href: "/supervisor/sales", label: "Sales", icon: Receipt },
  { href: "/supervisor/settings", label: "Settings", icon: Settings },
];

export function BottomNavigation() {
  const pathname = usePathname();
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

  const isSupervisor = profile.role.toLowerCase().includes("supervisor");
  const items = isSupervisor ? supervisorItems : dseItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] transition-colors ${
                isActive
                  ? "text-[#E60012] bg-[#fff1f1] font-semibold"
                  : "text-gray-500 hover:text-[#E60012] hover:bg-[#fff8f8]"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-[#E60012]" : ""}`} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#E60012]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

