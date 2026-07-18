"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { apiFetch, getStoredApiUser } from "@/lib/api-client";
import { DEFAULT_PROFILE, getStoredProfile, saveProfile, type ProfileInfo } from "@/utils/profile";

export default function SupervisorSettingsPage() {
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    saveProfile(profile);
    // Sync with backend
    const apiUser = getStoredApiUser();
    if (apiUser) {
      try {
        await apiFetch("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify({ name: profile.name, region: profile.region }),
        });
      } catch {
        // Local save is enough if server is unreachable
      }
    }
    setSaving(false);
    setSaved(true);
    window.dispatchEvent(new Event("profile-updated"));
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <PageShell title="Supervisor Settings" description="Manage your basic profile and dashboard details.">
      <div className="grid gap-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Profile details</h3>
          <p className="mt-1 text-sm text-gray-500">You can update your display name and profile details here. Role and CUG stay fixed.</p>

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
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              <span className="mb-1 block">CUG</span>
              <input
                value={profile.cug}
                readOnly
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
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
            disabled={saving}
            className="mt-4 rounded-full bg-[#E60012] px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save profile"}
          </button>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Notification Settings</h3>
          <p className="mt-1 text-sm text-gray-500">Receive alerts for team prospect creations, visit milestones, and sales completions.</p>
        </div>
        
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">About App</h3>
          <p className="mt-1 text-sm text-gray-500">Airtel Prospect Manager v1.0.0 (Supervisor Console)</p>
        </div>
      </div>
    </PageShell>
  );
}
