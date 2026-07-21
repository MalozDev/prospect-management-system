"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, User } from "lucide-react";

import { clearToken, getStoredApiUser } from "@/lib/api-client";
import { getProfileInitials, getStoredProfile, type ProfileInfo, DEFAULT_PROFILE } from "@/utils/profile";
import { ProfileAvatar } from "@/components/shared/ProfileAvatar";

export function UserDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();

    const handleProfileUpdate = () => {
      loadProfile();
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  function loadProfile() {
    const stored = getStoredProfile();
    // If stored profile doesn't have avatarUrl, try API user as fallback
    if (!stored.avatarUrl?.startsWith("data:")) {
      const apiUser = getStoredApiUser();
      if (apiUser?.avatarUrl?.startsWith("data:")) {
        stored.avatarUrl = apiUser.avatarUrl;
      }
    }
    setProfile(stored);
  }

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleLogout() {
    setOpen(false);
    clearToken();
    localStorage.removeItem("crm-profile");
    router.push("/login");
  }

  const initials = getProfileInitials(profile.name);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm transition hover:border-gray-300 hover:bg-gray-50"
      >
        <ProfileAvatar
          name={profile.name}
          avatarUrl={profile.avatarUrl?.startsWith("data:") ? profile.avatarUrl : ""}
          size="sm"
        />
        <span className="hidden sm:inline font-medium text-gray-900">{profile.name}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-[9999] mt-2 w-64 origin-top-right animate-in fade-in zoom-in-95 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg ring-1 ring-black/5">
            {/* User info header */}
            <div className="flex items-center gap-3 rounded-xl bg-[#fff8f8] px-3 py-3">
              <ProfileAvatar
                name={profile.name}
                avatarUrl={profile.avatarUrl?.startsWith("data:") ? profile.avatarUrl : ""}
                size="lg"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
                <p className="text-xs text-gray-500">{profile.role} · {profile.cug}</p>
              </div>
            </div>

            {/* Menu items */}
            <div className="mt-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (profile.role.toLowerCase().includes("supervisor")) {
                    router.push("/supervisor/settings");
                  } else {
                    router.push("/profile");
                  }
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition hover:bg-gray-100"
              >
                <User className="h-4 w-4" />
                My Profile
              </button>
            </div>

            {/* Divider */}
            <div className="my-1 border-t border-gray-100" />

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
