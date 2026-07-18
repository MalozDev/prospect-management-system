import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";

interface ProspectCardProspect {
  _id?: unknown;
  id?: string;
  name: string;
  location: string;
  phone: string;
  expectedPurchaseDate: string;
  assignedDse: string;
  status: string;
}

interface ProspectCardProps {
  prospect: ProspectCardProspect;
}

export function ProspectCard({ prospect }: ProspectCardProps) {
  const prospectId = prospect._id ?? prospect.id ?? "";
  
  return (
    <Link href="/followups" className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">{prospect.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{prospect.location}</p>
        </div>
        <StatusBadge status={prospect.status} />
      </div>
      <div className="mt-4 space-y-1 text-sm text-gray-600">
        <p>Phone: {prospect.phone}</p>
        <p>Expected: {prospect.expectedPurchaseDate}</p>
        <p>Assigned DSE: {prospect.assignedDse}</p>
      </div>
    </Link>
  );
}
