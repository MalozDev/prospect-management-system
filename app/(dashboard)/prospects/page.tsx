"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/shared/PageShell";
import { ProspectCard } from "@/components/shared/ProspectCard";
import { prospects as mockProspects, type Prospect } from "@/lib/mock-data";

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("mockProspects") : null;
    const savedProspects = stored ? (JSON.parse(stored) as Prospect[]) : [];
    setProspects([...savedProspects, ...mockProspects]);
  }, []);

  return (
    <PageShell title="Prospects" description="Track the customers you are engaging across the field.">
      <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">{prospects.length} prospects in view</p>
        <Link href="/prospects/new" className="rounded-full bg-[#E60012] px-4 py-2 text-sm font-medium text-white">
          + New Prospect
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {prospects.map((prospect) => (
          <ProspectCard key={prospect.id} prospect={prospect} />
        ))}
      </div>
    </PageShell>
  );
}
