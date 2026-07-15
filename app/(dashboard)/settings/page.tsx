"use client";

import { useEffect, useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { DEFAULT_PROFILE, getStoredProfile, saveProfile, type ProfileInfo } from "@/utils/profile";

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);

  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  function handleChange(field: keyof ProfileInfo, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    saveProfile(profile);
    window.dispatchEvent(new Event("profile-updated"));
  }

  return (
    <PageShell title="Settings" description="Manage your basic profile details.">
      <div className="grid gap-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Profile details</h3>
          <p className="mt-1 text-sm text-gray-500">You can update your display name and profile details here. Role and CUG stay fixed after creation.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
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

          <button
            type="button"
            onClick={handleSave}
            className="mt-4 rounded-full bg-[#E60012] px-4 py-2 text-sm font-medium text-white"
          >
            Save profile
          </button>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Theme</h3>
          <p className="mt-1 text-sm text-gray-500">Light theme is currently enabled.</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <p className="mt-1 text-sm text-gray-500">Enabled for follow-ups, visits, and sales updates.</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">About App</h3>
          <p className="mt-1 text-sm text-gray-500">Airtel Prospect Manager v1.0.0</p>
        </div>
      </div>
    </PageShell>
  );
}
