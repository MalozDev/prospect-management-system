import { AuthGuard } from "@/components/shared/AuthGuard";

export default function DeveloperDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
