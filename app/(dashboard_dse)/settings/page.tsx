"use client";

import { useEffect, useRef, useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { ProfileAvatar } from "@/components/shared/ProfileAvatar";
import { apiFetch, getStoredApiUser, setStoredApiUser } from "@/lib/api-client";
import { DEFAULT_PROFILE, getStoredProfile, saveProfile, type ProfileInfo } from "@/utils/profile";
import { resizeImage } from "@/lib/resize-image";

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState(false);
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

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB raw file)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    setSaveError("");
    try {
      // Resize to max 300px with JPEG compression -> ~50-80KB Data URL
      const resizedDataUrl = await resizeImage(file, 300, 0.7);
      setProfile((current) => ({ ...current, avatarUrl: resizedDataUrl }));
      setSaved(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setUploading(false);
    }
  }

  function clearAvatar() {
    setProfile((current) => ({ ...current, avatarUrl: "" }));
    setSaved(false);
  }

  // Check if profile has an uploaded photo (data URL)
  const hasPhoto = profile.avatarUrl?.startsWith("data:");

  // Load avatar from backend on mount if local storage doesn't have one
  useEffect(() => {
    async function loadAvatarFromBackend() {
      const stored = getStoredProfile();
      if (stored.avatarUrl?.startsWith("data:")) return; // Already have a photo locally
      const apiUser = getStoredApiUser();
      if (apiUser?.avatarUrl?.startsWith("data:")) {
        setProfile((current) => ({ ...current, avatarUrl: apiUser.avatarUrl! }));
      }
    }
    loadAvatarFromBackend();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    // Always save to localStorage first
    saveProfile(profile);
    window.dispatchEvent(new Event("profile-updated"));

    // Sync with backend
    const apiUser = getStoredApiUser();
    if (apiUser) {
      try {
        const body: Record<string, string> = { name: profile.name, region: profile.region };
        if (profile.avatarUrl) {
          body.avatarUrl = profile.avatarUrl;
        }
        const result = await apiFetch<{ user: { avatarUrl?: string } }>("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify(body),
        });

        // Update the stored API user with the returned avatar URL
        if (result?.user) {
          setStoredApiUser({ ...apiUser, ...result.user });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not sync with server.";
        setSaveError(`Profile saved locally. ${msg}`);
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <PageShell title="Settings" description="Manage your basic profile details.">
      <div className="grid gap-4">
        {/* Avatar Section */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">Profile Picture</h3>
          <p className="mt-1 text-sm text-gray-500">Upload a photo to personalise your profile.</p>

          <div className="mt-4 flex flex-col items-center gap-4">
            <ProfileAvatar
              name={profile.name}
              avatarUrl={hasPhoto ? profile.avatarUrl : ""}
              size="xl"
            />

            {/* Upload & clear buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-[#E60012] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 shadow-sm"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {hasPhoto ? "Change photo" : "Upload photo"}
              </button>
              {hasPhoto && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
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
            <p className="text-[10px] text-gray-400">Max 5MB · will be resized to 300px</p>

            {uploading && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Processing image...
              </div>
            )}

            {!hasPhoto && (
              <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Your photo will appear on your profile and across the app once uploaded.</p>
                </div>
              </div>
            )}
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
            disabled={saving || uploading}
            className="mt-4 rounded-full bg-[#E60012] px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save profile"}
          </button>
          {saveError && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-600">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {saveError}
            </p>
          )}
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
