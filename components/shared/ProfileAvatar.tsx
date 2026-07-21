"use client";

import { cn } from "@/lib/utils";

// ── Color palette for consistent avatar initial colors ──
const AVATAR_COLORS = [
  { bg: "bg-red-500", ring: "ring-red-200" },
  { bg: "bg-blue-500", ring: "ring-blue-200" },
  { bg: "bg-emerald-500", ring: "ring-emerald-200" },
  { bg: "bg-purple-500", ring: "ring-purple-200" },
  { bg: "bg-amber-500", ring: "ring-amber-200" },
  { bg: "bg-cyan-500", ring: "ring-cyan-200" },
  { bg: "bg-pink-500", ring: "ring-pink-200" },
  { bg: "bg-indigo-500", ring: "ring-indigo-200" },
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
function getAvatarColorClasses(index: number) {
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

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string;
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
  size = "md",
  className,
  showName = false,
  namePosition = "below",
}: ProfileAvatarProps) {
  const initials = getAvatarInitials(name || "User");
  const colorClasses = getAvatarColorClasses(hashAvatarColor(name));
  const sizeStyle = sizeMap[size];

  // Show uploaded photo if avatarUrl exists and is a data URL
  const hasPhoto = avatarUrl && avatarUrl.startsWith("data:");

  const avatarElement = hasPhoto ? (
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
        colorClasses.bg,
        colorClasses.ring,
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
