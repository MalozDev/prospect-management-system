import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { TARGET_KEYS, DEFAULT_TARGET_VALUES, type TargetKey } from "@/lib/target-keys";

export interface Targets {
  daily: number;
  weekly: number;
  monthly: number;
  team: number;
}

const FALLBACK: Targets = {
  daily: Number(DEFAULT_TARGET_VALUES[TARGET_KEYS.DAILY as TargetKey]),
  weekly: Number(DEFAULT_TARGET_VALUES[TARGET_KEYS.WEEKLY as TargetKey]),
  monthly: Number(DEFAULT_TARGET_VALUES[TARGET_KEYS.MONTHLY as TargetKey]),
  team: Number(DEFAULT_TARGET_VALUES[TARGET_KEYS.TEAM as TargetKey]),
};

/**
 * Fetch sales targets from the Settings API once on mount.
 * Falls back to hardcoded defaults if the API is unreachable.
 */
export function useTargets(): Targets {
  const [targets, setTargets] = useState<Targets>(FALLBACK);

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ targets: Record<string, string> }>("/api/settings/targets")
      .then((data) => {
        if (cancelled || !data.targets) return;
        setTargets({
          daily: safeParse(data.targets[TARGET_KEYS.DAILY], FALLBACK.daily),
          weekly: safeParse(data.targets[TARGET_KEYS.WEEKLY], FALLBACK.weekly),
          monthly: safeParse(data.targets[TARGET_KEYS.MONTHLY], FALLBACK.monthly),
          team: safeParse(data.targets[TARGET_KEYS.TEAM], FALLBACK.team),
        });
      })
      .catch(() => {
        // Keep fallback defaults
      });

    return () => { cancelled = true; };
  }, []);

  return targets;
}

function safeParse(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return !isNaN(n) && n > 0 ? n : fallback;
}
