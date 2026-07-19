"use client";

import { cn } from "@/lib/utils";

// ── Color palette for consistent avatar colors ──
const AVATAR_COLORS = [
  { bg: "bg-red-500", ring: "ring-red-200" },
  { bg: "bg-blue-500", ring: "ring-blue-200" },
  { bg: "bg-emerald-500", ring: "ring-emerald-200" },
  { bg: "bg-purple-500", ring: "ring-purple-200" },
  { bg: "bg-amber-500", ring: "ring-amber-200" },
  { bg: "bg-cyan-500", ring: "ring-cyan-200" },
  { bg: "bg-pink-500", ring: "ring-pink-200" },
  { bg: "bg-indigo-500", ring: "ring-indigo-200" },
  { bg: "bg-orange-500", ring: "ring-orange-200" },
  { bg: "bg-teal-500", ring: "ring-teal-200" },
  { bg: "bg-rose-500", ring: "ring-rose-200" },
  { bg: "bg-fuchsia-500", ring: "ring-fuchsia-200" },
];

/** Derive a consistent color index from a name string */
export function hashAvatarColor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

/** Get the Tailwind classes for a given color index */
export function getAvatarColorClasses(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** Extract initials (max 2 chars) from a name */
export function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Pre-defined color palette for user selection */
export const AVATAR_COLOR_PALETTE = [
  "#EF4444", // red
  "#3B82F6", // blue
  "#10B981", // emerald
  "#8B5CF6", // purple
  "#F59E0B", // amber
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#6366F1", // indigo
  "#F97316", // orange
  "#14B8A6", // teal
  "#F43F5E", // rose
  "#D946EF", // fuchsia
];

const HEX_TO_BG: Record<string, string> = {
  "#EF4444": "bg-red-500",
  "#3B82F6": "bg-blue-500",
  "#10B981": "bg-emerald-500",
  "#8B5CF6": "bg-purple-500",
  "#F59E0B": "bg-amber-500",
  "#06B6D4": "bg-cyan-500",
  "#EC4899": "bg-pink-500",
  "#6366F1": "bg-indigo-500",
  "#F97316": "bg-orange-500",
  "#14B8A6": "bg-teal-500",
  "#F43F5E": "bg-rose-500",
  "#D946EF": "bg-fuchsia-500",
};

const HEX_TO_RING: Record<string, string> = {
  "#EF4444": "ring-red-200",
  "#3B82F6": "ring-blue-200",
  "#10B981": "ring-emerald-200",
  "#8B5CF6": "ring-purple-200",
  "#F59E0B": "ring-amber-200",
  "#06B6D4": "ring-cyan-200",
  "#EC4899": "ring-pink-200",
  "#6366F1": "ring-indigo-200",
  "#F97316": "ring-orange-200",
  "#14B8A6": "ring-teal-200",
  "#F43F5E": "ring-rose-200",
  "#D946EF": "ring-fuchsia-200",
};

/** Map a hex color to the closest tailwind bg class */
export function hexToTailwindBg(hex: string): string {
  return HEX_TO_BG[hex] || "bg-gray-400";
}

/** Map a hex color to ring class */
export function hexToTailwindRing(hex: string): string {
  return HEX_TO_RING[hex] || "ring-gray-200";
}

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string;
  avatarColor?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showName?: boolean;
  namePosition?: "right" | "below";
}

const sizeMap = {
  sm: { container: "h-7 w-7 text-[9px]", ring: "ring-1" },
  md: { container: "h-9 w-9 text-xs", ring: "ring-2" },
  lg: { container: "h-12 w-12 text-sm", ring: "ring-2" },
  xl: { container: "h-16 w-16 text-lg", ring: "ring-2" },
};

export function ProfileAvatar({
  name,
  avatarUrl,
  avatarColor,
  size = "md",
  className,
  showName = false,
  namePosition = "below",
}: ProfileAvatarProps) {
  const initials = getAvatarInitials(name || "User");
  const colorIndex = avatarColor
    ? AVATAR_COLOR_PALETTE.indexOf(avatarColor)
    : hashAvatarColor(name);
  const colorClasses = getAvatarColorClasses(colorIndex >= 0 ? colorIndex : hashAvatarColor(name));
  const sizeStyle = sizeMap[size];

  const avatarElement = avatarUrl && !avatarUrl.startsWith("#") ? (
    <img
      src={avatarUrl}
      alt={name}
      className={cn(
        "rounded-full object-cover",
        sizeStyle.container,
        sizeStyle.ring,
        "ring-white ring-offset-1",
        className
      )}
    />
  ) : (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white",
        sizeStyle.container,
        sizeStyle.ring,
        "ring-white ring-offset-1",
        avatarColor ? hexToTailwindBg(avatarColor) : colorClasses.bg,
        avatarColor ? hexToTailwindRing(avatarColor) : colorClasses.ring,
        className
      )}
    >
      {initials}
    </div>
  );

  if (!showName) return avatarElement;

  return (
    <div className={cn("flex items-center gap-2", namePosition === "below" && "flex-col")}>
      {avatarElement}
      <span className={cn(
        "font-medium text-gray-900",
        size === "sm" ? "text-xs" : "text-sm",
        namePosition === "below" && "text-[10px] text-gray-500"
      )}>
        {name.split(/\s+/)[0]}
      </span>
    </div>
  );
}
