import Link from "next/link";
import { Phone, StickyNote } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useMemo } from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import { getStoredProfile } from "@/utils/profile";

interface ProspectCardProspect {
  _id?: unknown;
  id?: string;
  title?: string;
  name: string;
  location: string;
  phone: string;
  expectedPurchaseDate: string;
  assignedDse: string;
  status: string;
  notes?: string;
}

interface ProspectCardProps {
  prospect: ProspectCardProspect;
}

export function ProspectCard({ prospect }: ProspectCardProps) {
  const prospectId = prospect._id ?? prospect.id ?? "";
  const dseName = useMemo(() => getStoredProfile().name, []);
  
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
        <p className="flex items-center gap-1">
          <Phone className="h-3.5 w-3.5 text-gray-400" />
          <a
            href={`tel:${prospect.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[#E60012] hover:underline"
            aria-label={`Call ${prospect.name}`}
          >
            {prospect.phone}
          </a>
        </p>
        <p>Expected: {prospect.expectedPurchaseDate}</p>
        <p>Assigned DSE: {prospect.assignedDse}</p>
        {prospect.notes?.trim() && (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>{prospect.notes}</span>
          </p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={`tel:${prospect.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-[#E60012] transition hover:bg-red-50 hover:border-red-200"
          aria-label={`Call ${prospect.name}`}
        >
          <Phone className="h-3.5 w-3.5" /> Call
        </a>
        <a
          href={buildWhatsAppUrl(prospect.phone, buildWhatsAppMessage({ customerName: prospect.name, dseName, title: prospect.title, location: prospect.location, notes: prospect.notes }))}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50 hover:border-green-200"
          aria-label={`WhatsApp ${prospect.name}`}
        >
          <FaWhatsapp className="h-3.5 w-3.5" /> WhatsApp
        </a>
      </div>
    </Link>
  );
}
