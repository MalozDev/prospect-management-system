/** Check whether a string can be parsed into a valid Date. */
export function isValidDateStr(str: string): boolean {
  if (!str) return false;
  const d = new Date(str).getTime();
  return !isNaN(d);
}

/**
 * Convert an ISO timestamp or date string into a human-readable relative time.
 *
 * Examples: "Just now", "2 min ago", "1 hour ago", "Yesterday", "3 days ago"
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";

  const now = Date.now();
  const date = new Date(dateStr).getTime();

  if (isNaN(date)) return "Recently";

  const diffMs = now - date;

  // Less than 5 seconds
  if (diffMs < 5_000) return "Just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}min ago`;
  if (hours < 24) return `${hours}h ago`;

  // Yesterday is between start of yesterday and start of today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = todayStart.getTime();

  const yesterdayStartTs = todayStartTs - 86_400_000;

  if (date >= yesterdayStartTs && date < todayStartTs) {
    return "Yesterday";
  }

  if (days < 7) return `${days}d ago`;

  // Older – show short date
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
