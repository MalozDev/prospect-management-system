export const COMMISSION_PER_SALE = 200;

export function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekStartIso() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  return weekStart.toISOString().slice(0, 10);
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
