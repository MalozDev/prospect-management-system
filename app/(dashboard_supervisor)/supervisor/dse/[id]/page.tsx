"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Users, ShoppingCart, TrendingUp, DollarSign, Calendar } from "lucide-react";

import { PageShell } from "@/components/shared/PageShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { prospects as mockProspects, sales as mockSales, type Prospect, type Sale } from "@/lib/mock-data";

const COMMISSION_PER_SALE = 200;

function getStoredProspects(): Prospect[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mockProspects");
    return raw ? (JSON.parse(raw) as Prospect[]) : [];
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function DseDetailPage({ params }: PageProps) {
  const [dseName, setDseName] = useState<string>("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    // Safely unwrap Next.js 15/16 async params
    Promise.resolve(params).then((resolved) => {
      setDseName(decodeURIComponent(resolved.id));
    });
  }, [params]);

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        const stored = getStoredProspects();
        setProspects([...stored, ...mockProspects]);
        setSales(mockSales);
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  // Filter down to this DSE's records
  const dseProspects = useMemo(() => {
    return prospects.filter((p) => p.assignedDse === dseName);
  }, [prospects, dseName]);

  const dseSales = useMemo(() => {
    return sales.filter((s) => s.soldBy === dseName);
  }, [sales, dseName]);

  const stats = useMemo(() => {
    const pCount = dseProspects.length;
    const sCount = dseSales.length;
    const convRate = pCount > 0 ? Math.round((sCount / pCount) * 100) : 0;
    const comm = sCount * COMMISSION_PER_SALE;

    return {
      prospectsCount: pCount,
      salesCount: sCount,
      conversionRate: convRate,
      revenue: comm,
      commission: comm,
    };
  }, [dseProspects, dseSales]);

  return (
    <PageShell title={`${dseName}'s Performance`} description="Detailed breakdown of field activities and sales conversion.">
      <div className="mb-6">
        <Link 
          href="/supervisor/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#E60012]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#E60012]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Prospects Created</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.prospectsCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#E60012]">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sales Completed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.salesCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#E60012]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Conversion Rate</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#E60012]">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">ODU Revenue</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">K{stats.revenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prospects List */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Assigned Prospects</h3>
          <div className="space-y-3">
            {dseProspects.map((prospect) => (
              <div key={prospect.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 hover:border-gray-200 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{prospect.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{prospect.location}</p>
                  </div>
                  <StatusBadge status={prospect.status} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Phone: {prospect.phone}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {prospect.expectedPurchaseDate}</span>
                </div>
              </div>
            ))}
            {dseProspects.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No prospects assigned to this DSE.</p>
            )}
          </div>
        </div>

        {/* Sales List */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Sales Records</h3>
          <div className="space-y-3">
            {dseSales.map((sale) => (
              <div key={sale.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 hover:border-gray-200 transition">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{sale.customer}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">ODU</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">K{COMMISSION_PER_SALE}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{sale.date}</p>
                  </div>
                </div>
              </div>
            ))}
            {dseSales.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No sales logged by this DSE.</p>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
