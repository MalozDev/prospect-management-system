"use client";

import { useEffect, useState } from "react";

import { BottomNavigation } from "@/components/shared/BottomNavigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { getProfileInitials, getStoredProfile } from "@/utils/profile";

interface PageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function PageShell({ title, description, children }: PageShellProps) {
  const [profileName, setProfileName] = useState("Nalu Mwansa");

  useEffect(() => {
    setProfileName(getStoredProfile().name);

    const handleProfileUpdate = () => {
      setProfileName(getStoredProfile().name);
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  const initials = getProfileInitials(profileName);

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-gray-900">
      <div className="mx-auto flex max-w-7xl">
        <Sidebar />
        <main className="flex-1 pb-24 md:pb-8">
          <div className="border-b border-gray-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
              </div>
              <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-[#fff8f8] px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E60012] text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-gray-900">{profileName}</p>
                  <p className="text-xs text-gray-500">Profile</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}
