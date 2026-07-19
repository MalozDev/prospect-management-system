"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
} from "lucide-react";

import { clearToken, getStoredApiUser } from "@/lib/api-client";

const navItems = [
  { href: "/developer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/developer/users", label: "Users", icon: Users },
  { href: "/developer/settings", label: "Settings", icon: Settings },
];

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [apiUser, setApiUser] = useState<ReturnType<typeof getStoredApiUser>>(null);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    setApiUser(getStoredApiUser());
    const handleUpdate = () => setApiUser(getStoredApiUser());
    window.addEventListener("profile-updated", handleUpdate);
    return () => window.removeEventListener("profile-updated", handleUpdate);
  }, []);

  const handleLogout = () => {
    clearToken();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] text-gray-100">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden h-screen w-72 flex-col border-r border-gray-800 bg-[#1a1a3e] p-6 md:flex">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Dev Console</p>
                <p className="text-xs text-blue-300">SuperAdmin Access</p>
              </div>
            </div>
          </div>

          {/* User dropdown */}
          <div className="relative mb-6">
            <button
              type="button"
              onClick={() => setShowLogout(!showLogout)}
              className="flex w-full items-center gap-3 rounded-xl bg-[#252550] px-4 py-3 text-left transition hover:bg-[#2f2f60]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
                {apiUser?.name?.charAt(0) || "D"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {apiUser?.name || "Developer"}
                </p>
                <p className="text-xs text-gray-400 truncate">CUG: {apiUser?.cugSuffix || "2288"}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition ${showLogout ? "rotate-180" : ""}`} />
            </button>

            {showLogout && (
              <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-gray-700 bg-[#1a1a3e] py-2 shadow-xl">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[#252550] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          <nav className="space-y-1.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/developer/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white border border-purple-500/30"
                      : "text-gray-400 hover:bg-[#252550] hover:text-gray-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-purple-400" : ""}`} />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-purple-500" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-gray-700/50 bg-[#252550] p-4">
            <p className="text-sm font-semibold text-white">System Status</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">All systems operational</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 pb-24 md:pb-8">
          <div className="border-b border-gray-800 bg-[#1a1a3e]/80 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-purple-400" />
                <h1 className="text-lg font-semibold text-white">Developer Console</h1>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#252550] px-4 py-2 text-sm text-red-400 transition hover:bg-[#2f2f60] md:hidden"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-[#1a1a3e]/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] transition-colors ${
                  isActive ? "text-purple-400" : "text-gray-500 hover:text-purple-400"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : ""}`} />
                <span>{label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-purple-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
