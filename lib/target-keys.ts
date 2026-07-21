/** Setting keys used to persist sales targets in the database. */
export const TARGET_KEYS = {
  DAILY: "daily_sales_target",
  WEEKLY: "weekly_sales_target",
  MONTHLY: "monthly_sales_target",
  TEAM: "team_target",
  PROSPECT_DAILY: "daily_prospect_target",
} as const;

export type TargetKey = (typeof TARGET_KEYS)[keyof typeof TARGET_KEYS];

/** Default values that are used until a supervisor overrides them. */
export const DEFAULT_TARGET_VALUES: Record<TargetKey, string> = {
  [TARGET_KEYS.DAILY]: "2",
  [TARGET_KEYS.WEEKLY]: "12",
  [TARGET_KEYS.MONTHLY]: "25",
  [TARGET_KEYS.TEAM]: "400",
  [TARGET_KEYS.PROSPECT_DAILY]: "5",
} as const;

/** Parse stored target strings into numbers (falls back to defaults). */
export function parseTarget(
  key: TargetKey,
  storedValue?: string
): number {
  if (storedValue !== undefined) {
    const n = Number(storedValue);
    if (!isNaN(n) && n > 0) return n;
  }
  return Number(DEFAULT_TARGET_VALUES[key]);
}
