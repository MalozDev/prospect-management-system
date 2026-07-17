"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PageShell } from "@/components/shared/PageShell";
import { DEFAULT_PROFILE, getProfileInitials, getStoredProfile, saveProfile, type ProfileInfo } from "@/utils/profile";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setProfile(getStoredProfile());
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  function handleChange(field: keyof ProfileInfo, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    saveProfile(profile);
    window.dispatchEvent(new Event("profile-updated"));
  }

  function handleLogout() {
    localStorage.removeItem("crm-profile");
    router.push("/login");
  }

  return (
    <PageShell title="Profile" description="Edit your basic account details.">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f1] text-lg font-semibold text-[#E60012]">
            {getProfileInitials(profile.name)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.role}</p>
            <p className="text-sm text-gray-500">{profile.region}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            <span className="mb-1 block">Name</span>
            <input
              value={profile.name}
              onChange={(event) => handleChange("name", event.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/20"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            <span className="mb-1 block">Role</span>
            <input
              value={profile.role}
              readOnly
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            <span className="mb-1 block">CUG</span>
            <input
              value={profile.cug}
              readOnly
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </label>
          <label className="text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1 block">Region</span>
            <input
              value={profile.region}
              onChange={(event) => handleChange("region", event.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#E60012] focus:ring-2 focus:ring-[#E60012]/20"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-[#E60012] px-4 py-2 text-sm font-medium text-white"
          >
            Save profile
          </button>
          <Link href="/settings" className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
            Open settings
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-medium text-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </PageShell>
  );
}
