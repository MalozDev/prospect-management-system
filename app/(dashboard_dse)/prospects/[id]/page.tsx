import { redirect } from "next/navigation";

interface ProspectPageProps {
  params: { id: string };
}

export default function ProspectDetailPage({ params }: ProspectPageProps) {
  void params;
  redirect("/followups");
}
