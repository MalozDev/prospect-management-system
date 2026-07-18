import { ProspectCard } from "@/components/shared/ProspectCard";

interface ProspectPreview {
  _id?: string;
  name: string;
  location: string;
  phone: string;
  expectedPurchaseDate: string;
  assignedDse: string;
  status: string;
}

interface TodayProspectsProps {
  prospects: ProspectPreview[];
}

export function TodayProspects({ prospects }: TodayProspectsProps) {
  if (prospects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
        <p className="font-semibold text-gray-900">No prospects scheduled for today.</p>
        <p className="mt-2 text-sm">Capture a new prospect and it will show here immediately.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {prospects.map((prospect) => (
        <ProspectCard key={prospect._id ?? prospect.name} prospect={prospect} />
      ))}
    </div>
  );
}
