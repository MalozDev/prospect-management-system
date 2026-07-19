"use client";

import { useEffect, useRef, useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { ProfileAvatar, AVATAR_COLOR_PALETTE, hexToTailwindBg } from "@/components/shared/ProfileAvatar";
import { apiFetch, getStoredApiUser } from "@/lib/api-client";
import { DEFAULT_PROFILE, getStoredProfile, saveProfile, type ProfileInfo } from "@/utils/profile";

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleColorSelect(color: string) {
    setProfile((current) => ({ ...current, avatarUrl: color }));
    setSaved(false);
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setProfile((current) => ({ ...current, avatarUrl: dataUrl }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  function clearAvatar() {
    setProfile((current) => ({ ...current, avatarUrl: "" }));
    setSaved(false);
  }

  // Detect if avatarUrl is a hex color or a data URL
  const hasPhoto = profile.avatarUrl && !profile.avatarUrl.startsWith("#");
  const selectedColor = profile.avatarUrl?.startsWith("#") ? profile.avatarUrl : "";

  async function handleSave() {
    setSaving(true);
    saveProfile(profile);
    // Sync with backend
    const apiUser = getStoredApiUser();
    if (apiUser) {
      try {
        const body: Record<string, string> = { name: profile.name, region: profile.region };
        if (profile.avatarUrl) {
          if (profile.avatarUrl.startsWith("#")) {
            body.avatarColor = profile.avatarUrl;
          } else {
            body.avatarUrl = profile.avatarUrl;
          }
        }
        await apiFetch("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify(body),
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
    <PageShell title="Settings" description="Manage your basic profile details.">
      <div className="grid gap-4">
        {/* Avatar Section */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Profile Picture</h3>
          <p className="mt-1 text-sm text-gray-500">Choose a color avatar or upload a photo.</p>

          <div className="mt-4 flex flex-col items-center gap-4">
            <ProfileAvatar
              name={profile.name}
              avatarUrl={hasPhoto ? profile.avatarUrl : ""}
              avatarColor={selectedColor}
              size="xl"
            />

            {/* Color palette */}
            <div>
              <p className="mb-2 text-center text-xs font-medium text-gray-500">Pick a color</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {AVATAR_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={`h-8 w-8 rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      selectedColor === color ? "ring-2 ring-gray-400 ring-offset-2 scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Upload & clear buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {hasPhoto ? "Change photo" : "Upload photo"}
              </button>
              {profile.avatarUrl && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <p className="text-[10px] text-gray-400">Max 2MB · JPEG, PNG, or GIF</p>
          </div>
        </div>

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
            disabled={saving}
            className="mt-4 rounded-full bg-[#E60012] px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save profile"}
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
