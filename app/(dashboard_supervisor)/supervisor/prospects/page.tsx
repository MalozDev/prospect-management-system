"use client";

import { useState, useMemo } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { DseProspectPanel } from "@/components/supervisor/DseProspectPanel";
import { StatusFilterBar, type ProspectStatusFilter } from "@/components/supervisor/StatusFilterBar";
import { useApiData } from "@/lib/use-api-data";
import type { IProspect } from "@/lib/models/Prospect";

function matchesStatusFilter(prospect: IProspect, filter: ProspectStatusFilter, today: string) {
  switch (filter) {
    case "TODAY":
      return prospect.createdAt === today;
    case "PROSPECT":
      return prospect.status === "NEW";
    case "SOLD":
      return prospect.status === "SOLD";
    case "CONTACT":
      return prospect.status === "CONTACTED";
    case "LOST":
      return prospect.status === "LOST";
    default:
      return true;
  }
}

export default function SupervisorProspectsPage() {
  const { data } = useApiData<{ prospects: IProspect[] }>("/api/prospects", { prospects: [] });
  const [selectedDse, setSelectedDse] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<ProspectStatusFilter>("ALL");

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const prospects = data.prospects;

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const matchDse = selectedDse === "ALL" || p.assignedDse === selectedDse;
      const matchStatus = statusFilter === "ALL" || matchesStatusFilter(p, statusFilter, today);
      return matchDse && matchStatus;
    });
  }, [prospects, selectedDse, statusFilter, today]);

  const filterCounts = useMemo(() => {
    const base = selectedDse === "ALL" ? prospects : prospects.filter((p) => p.assignedDse === selectedDse);
    return {
      ALL: base.length,
      TODAY: base.filter((p) => p.createdAt === today).length,
      PROSPECT: base.filter((p) => p.status === "NEW").length,
      SOLD: base.filter((p) => p.status === "SOLD").length,
      CONTACT: base.filter((p) => p.status === "CONTACTED").length,
      LOST: base.filter((p) => p.status === "LOST").length,
    };
  }, [prospects, selectedDse, today]);

  const dseGroups = useMemo(() => {
    const names =
      selectedDse === "ALL"
        ? Array.from(new Set([...prospects.map((p) => p.assignedDse)])).filter(Boolean)
        : [selectedDse];

    return names
      .map((name) => ({
        name,
        prospects: filteredProspects.filter((p) => p.assignedDse === name),
      }))
      .filter((group) => group.prospects.length > 0 || selectedDse !== "ALL");
  }, [filteredProspects, prospects, selectedDse]);

  return (
    <PageShell title="Team Prospects" description="Filter and review ODU prospect performance per DSE.">
      <StatusFilterBar
        counts={filterCounts}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      <div className="mt-4 flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">DSE</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedDse("ALL")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selectedDse === "ALL" ? "bg-[#E60012] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {Array.from(new Set(prospects.map((p) => p.assignedDse))).filter(Boolean).map((dse) => (
            <button
              key={dse}
              type="button"
              onClick={() => setSelectedDse(dse)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedDse === dse ? "bg-[#E60012] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {dse}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-4">{filteredProspects.length} prospect{filteredProspects.length !== 1 ? "s" : ""} match{filteredProspects.length === 1 ? "es" : ""} the current filters.</p>
      </div>

      <div className="space-y-6">
        {dseGroups.map((group) => (
          <DseProspectPanel key={group.name} dseName={group.name} prospects={group.prospects} />
        ))}
        {dseGroups.length === 0 && (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No prospects match the current filters.
          </div>
        )}
      </div>
    </PageShell>
  );
}
