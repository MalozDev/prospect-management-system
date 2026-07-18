export const COMMISSION_PER_SALE = 200;
export const DAILY_SALES_TARGET = 2;
export const WEEKLY_SALES_TARGET = 12;
export const MONTHLY_SALES_TARGET = 25;
export const TEAM_TARGET = 400;

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
