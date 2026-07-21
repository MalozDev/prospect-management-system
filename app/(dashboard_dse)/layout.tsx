import { AuthGuard } from "@/components/shared/AuthGuard";
import { SupervisorSessionCheck } from "@/components/shared/SupervisorSessionCheck";

export default function DseDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {children}
      <SupervisorSessionCheck />
    </AuthGuard>
  );
}
