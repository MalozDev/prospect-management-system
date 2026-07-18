"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, ShoppingCart, TrendingUp, DollarSign, Calendar } from "lucide-react";

import { PageShell } from "@/components/shared/PageShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useApiData } from "@/lib/use-api-data";
import type { IProspect } from "@/lib/models/Prospect";
import type { ISale } from "@/lib/models/Sale";

const COMMISSION_PER_SALE = 200;

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function DseDetailPage({ params }: PageProps) {
  const [dseName, setDseName] = useState<string>("");

  // Safely unwrap Next.js 15/16 async params
  useEffect(() => {
    Promise.resolve(params).then((resolved) => {
      setDseName(decodeURIComponent(resolved.id));
    });
  }, [params]);

  const { data: prospectsData } = useApiData<{ prospects: IProspect[] }>(
    dseName ? `/api/prospects?assignedDse=${encodeURIComponent(dseName)}` : null,
    { prospects: [] }
  );
  const { data: salesData } = useApiData<{ sales: ISale[] }>(
    dseName ? `/api/sales?soldBy=${encodeURIComponent(dseName)}` : null,
    { sales: [] }
  );

  const dseProspects = prospectsData.prospects;
  const dseSales = salesData.sales;

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

  if (!dseName) {
    return (
      <PageShell title="Loading..." description="Loading DSE details.">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#E60012]" />
        </div>
      </PageShell>
    );
  }

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
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <h3 className="mb-4 font-semibold text-gray-900">Assigned Prospects</h3>
          <div className="space-y-3">
            {dseProspects.map((prospect) => (
              <div key={String(prospect._id)} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{prospect.name}</h4>
                    <p className="mt-0.5 text-xs text-gray-500">{prospect.location}</p>
                  </div>
                  <StatusBadge status={prospect.status} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Phone: {prospect.phone}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {prospect.expectedPurchaseDate}
                  </span>
                </div>
              </div>
            ))}
            {dseProspects.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">No prospects assigned to this DSE.</p>
            )}
          </div>
        </div>

        {/* Sales List */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Sales Records</h3>
          <div className="space-y-3">
            {dseSales.map((sale) => (
              <div key={String(sale._id)} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{sale.customer}</h4>
                    <p className="mt-0.5 text-xs text-gray-500">ODU</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">K{COMMISSION_PER_SALE}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{sale.date}</p>
                  </div>
                </div>
              </div>
            ))}
            {dseSales.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">No sales logged by this DSE.</p>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
