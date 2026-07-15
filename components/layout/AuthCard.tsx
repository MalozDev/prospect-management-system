import { Card, CardContent } from "@/components/ui/card";

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md rounded-3xl border border-gray-200 bg-white/95 p-0 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur">
      <CardContent className="p-8 sm:p-10">
        {children}
      </CardContent>
    </Card>
  );
}