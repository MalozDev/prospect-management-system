import { activities, type ActivityItem, type Prospect, type Sale } from "@/lib/mock-data";
import { DSE_TEAM } from "@/constants/dse-team";

export const COMMISSION_PER_SALE = 200;
export const DAILY_SALES_TARGET = 1;
export const WEEKLY_SALES_TARGET = 6;
export const MONTHLY_SALES_TARGET = 25;

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

export function getStoredProspects(): Prospect[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mockProspects");
    return raw ? (JSON.parse(raw) as Prospect[]) : [];
  } catch {
    return [];
  }
}

export interface DsePerformanceStats {
  name: string;
  prospectsCount: number;
  salesCount: number;
  todayProspects: number;
  todaySales: number;
  weekSales: number;
  monthSales: number;
  dailyRemaining: number;
  weeklyRemaining: number;
  monthlyRemaining: number;
  dailyProgress: number;
  weeklyProgress: number;
  monthlyProgress: number;
  revenue: number;
}

export function computeDseStats(prospects: Prospect[], sales: Sale[]): DsePerformanceStats[] {
  const today = getTodayIso();
  const weekStart = getWeekStartIso();
  const currentMonth = getCurrentMonth();

  const names = Array.from(
    new Set([...DSE_TEAM, ...prospects.map((p) => p.assignedDse), ...sales.map((s) => s.soldBy)]),
  ).filter(Boolean);

  return names
    .map((name) => {
      const dseProspects = prospects.filter((p) => p.assignedDse === name);
      const dseSales = sales.filter((s) => s.soldBy === name);
      const todayProspects = dseProspects.filter((p) => p.createdAt === today).length;
      const todaySales = dseSales.filter((s) => s.date === today).length;
      const weekSales = dseSales.filter((s) => s.date >= weekStart && s.date <= today).length;
      const monthSales = dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length;
      const salesCount = dseSales.length;

      return {
        name,
        prospectsCount: dseProspects.length,
        salesCount,
        todayProspects,
        todaySales,
        weekSales,
        monthSales,
        dailyRemaining: Math.max(0, DAILY_SALES_TARGET - todaySales),
        weeklyRemaining: Math.max(0, WEEKLY_SALES_TARGET - weekSales),
        monthlyRemaining: Math.max(0, MONTHLY_SALES_TARGET - monthSales),
        dailyProgress: Math.min(100, Math.round((todaySales / DAILY_SALES_TARGET) * 100)),
        weeklyProgress: Math.min(100, Math.round((weekSales / WEEKLY_SALES_TARGET) * 100)),
        monthlyProgress: Math.min(100, Math.round((monthSales / MONTHLY_SALES_TARGET) * 100)),
        revenue: salesCount * COMMISSION_PER_SALE,
      };
    })
    .sort((a, b) => b.monthSales - a.monthSales || b.todaySales - a.todaySales);
}

export function getLiveFeedActivities(source = activities): ActivityItem[] {
  return source.filter(
    (activity) =>
      activity.type === "prospect" ||
      activity.type === "followup" ||
      activity.title.toLowerCase().includes("prospect created") ||
      activity.title.toLowerCase().includes("follow up"),
  );
}

export function groupTodayProspectsByDse(prospects: Prospect[]) {
  const today = getTodayIso();
  const grouped: Record<string, Prospect[]> = {};

  prospects
    .filter((p) => p.createdAt === today)
    .forEach((prospect) => {
      if (!grouped[prospect.assignedDse]) {
        grouped[prospect.assignedDse] = [];
      }
      grouped[prospect.assignedDse].push(prospect);
    });

  return grouped;
}

export function targetZoneColor(progress: number) {
  if (progress >= 75) return "#16a34a";
  if (progress >= 50) return "#fb923c";
  if (progress >= 25) return "#facc15";
  return "#dc2626";
}
