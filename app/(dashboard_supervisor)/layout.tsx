import { AuthGuard } from "@/components/shared/AuthGuard";

export default function SupervisorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
