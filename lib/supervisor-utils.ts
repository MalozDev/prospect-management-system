export const COMMISSION_PER_SALE = 200;

/**
 * Return today's date as YYYY-MM-DD in LOCAL timezone.
 * Critical fix: toISOString() returns UTC, which breaks in UTC+2 at early hours.
 */
export function getTodayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekStartIso() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentMonth() {
  return getTodayIso().slice(0, 7);
}

export function targetZoneColor(progress: number) {
  if (progress >= 75) return "#16a34a";
  if (progress >= 50) return "#fb923c";
  if (progress >= 25) return "#facc15";
  return "#dc2626";
}
