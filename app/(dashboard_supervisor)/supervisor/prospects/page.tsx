"use client";

import { useEffect, useState, useMemo } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { DseProspectPanel } from "@/components/supervisor/DseProspectPanel";
import { StatusFilterBar, type ProspectStatusFilter } from "@/components/supervisor/StatusFilterBar";
import { prospects as mockProspects, type Prospect } from "@/lib/mock-data";
import { DSE_TEAM } from "@/constants/dse-team";
import { getStoredProspects, getTodayIso } from "@/lib/supervisor-utils";

function matchesStatusFilter(prospect: Prospect, filter: ProspectStatusFilter, today: string) {
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
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedDse, setSelectedDse] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<ProspectStatusFilter>("ALL");

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        const stored = getStoredProspects();
        setProspects([...stored, ...mockProspects]);
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  const today = getTodayIso();

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
        ? Array.from(new Set([...DSE_TEAM, ...prospects.map((p) => p.assignedDse)])).filter(Boolean)
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
      {/* Status filter — single compact row on mobile */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Filter by status</p>
        <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={filterCounts} />
      </div>

      {/* DSE filter */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Filter by DSE
        </label>
        <select
          value={selectedDse}
          onChange={(e) => setSelectedDse(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#E60012]"
        >
          <option value="ALL">All DSEs ({DSE_TEAM.length} on board)</option>
          {Array.from(new Set([...DSE_TEAM, ...prospects.map((p) => p.assignedDse)]))
            .filter(Boolean)
            .map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
        </select>
      </div>

      {/* Summary strip */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-[#fff1f1] px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">
          {filteredProspects.length} prospect{filteredProspects.length !== 1 ? "s" : ""} matching filters
        </p>
        {statusFilter !== "ALL" && (
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className="text-xs font-semibold text-[#E60012]"
          >
            Clear status
          </button>
        )}
      </div>

      {/* DSE groups — DSE account layout on demand */}
      {dseGroups.length > 0 ? (
        <div className="space-y-3">
          {dseGroups.map((group, index) => (
            <DseProspectPanel
              key={group.name}
              dseName={group.name}
              prospects={group.prospects}
              defaultExpanded={selectedDse !== "ALL" || index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No prospects match the selected filters.
        </div>
      )}
    </PageShell>
  );
}
