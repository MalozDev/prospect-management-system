"use client";

import { useEffect, useState } from "react";
import { ProspectCard } from "@/components/shared/ProspectCard";
import { prospects as mockProspects, type Prospect } from "@/lib/mock-data";

const TODAY = "2026-07-15";

function loadStoredProspects(): Prospect[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem("mockProspects");
    if (!stored) return [];
    return JSON.parse(stored) as Prospect[];
  } catch {
    return [];
  }
}

export function TodayProspects() {
  const [todayProspects, setTodayProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    const stored = loadStoredProspects();
    const all = [...stored, ...mockProspects];
    const filtered = all.filter((prospect) => prospect.expectedPurchaseDate === TODAY);
    setTodayProspects(filtered.slice(0, 6));
  }, []);

  if (todayProspects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
        <p className="font-semibold text-gray-900">No prospects scheduled for today.</p>
        <p className="mt-2 text-sm">Capture a new prospect and it will show here immediately.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {todayProspects.map((prospect) => (
        <ProspectCard key={prospect.id} prospect={prospect} />
      ))}
    </div>
  );
}
