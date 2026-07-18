import { AuthGuard } from "@/components/shared/AuthGuard";

export default function DseDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
