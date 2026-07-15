export interface ProfileInfo {
  name: string;
  role: string;
  phone: string;
  region: string;
  cug: string;
  avatarUrl: string;
}

export const DEFAULT_PROFILE: ProfileInfo = {
  name: "Nalu Mwansa",
  role: "Direct Sales Executive",
  phone: "0978982288",
  region: "Lusaka",
  cug: "0978982288",
  avatarUrl: "",
};

const STORAGE_KEY = "crm-profile";

export function getStoredProfile(): ProfileInfo {
  if (typeof window === "undefined") return DEFAULT_PROFILE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;

    const parsed = JSON.parse(raw) as Partial<ProfileInfo>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: ProfileInfo) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getProfileInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}
