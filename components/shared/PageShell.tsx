import { BottomNavigation } from "@/components/shared/BottomNavigation";
import { Sidebar } from "@/components/shared/Sidebar";

interface PageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#f8f8f8] text-gray-900">
      <div className="mx-auto flex max-w-7xl">
        <Sidebar />
        <main className="flex-1 pb-24 md:pb-8">
          <div className="border-b border-gray-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}
