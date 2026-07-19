"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Shield,
  UserCog,
  KeyRound,
  CheckCircle2,
  XCircle,
  Users,
  UserPlus,
} from "lucide-react";

import { useApiData } from "@/lib/use-api-data";
import { apiFetch } from "@/lib/api-client";
import type { IUser } from "@/lib/models/User";

export default function DeveloperUsersPage() {
  const { data, loading, refetch } = useApiData<{ users: IUser[] }>("/api/users", { users: [] });
  const [search, setSearch] = useState("");
  const [resettingCug, setResettingCug] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return data.users;
    const q = search.toLowerCase();
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.cugSuffix.includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.region?.toLowerCase().includes(q)
    );
  }, [data.users, search]);

  const handleReset = useCallback(async () => {
    if (!resettingCug || !newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }

    setStatus("loading");
    setResetError("");
    setResetSuccess("");

    try {
      await apiFetch("/api/users/reset-password", {
        method: "POST",
        body: JSON.stringify({ cugSuffix: resettingCug, newPassword }),
      });
      setStatus("success");
      setResetSuccess(`Password reset successfully for CUG ${resettingCug}!`);
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess("");
        setNewPassword("");
        setResettingCug(null);
        setStatus("idle");
      }, 2000);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
      setStatus("error");
    }
  }, [resettingCug, newPassword]);

  const openResetModal = (cug: string) => {
    setResettingCug(cug);
    setNewPassword("");
    setResetError("");
    setResetSuccess("");
    setStatus("idle");
    setShowResetModal(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">User Management</h2>
        <p className="mt-1 text-sm text-gray-400">
          View all users and reset passwords when needed.
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Users className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Total Users</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{data.users.length}</p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-4">
          <div className="flex items-center gap-2 text-blue-400">
            <UserPlus className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">DSE</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.users.filter((u) => u.role === "DSE").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Supervisors</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.users.filter((u) => u.role === "SUPERVISOR").length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, CUG, role, or region..."
          className="h-12 w-full rounded-xl border border-gray-700/50 bg-[#1a1a3e] pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
        />
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-500" />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid gap-3">
          {filteredUsers.map((user) => (
            <div
              key={String(user._id)}
              className="rounded-xl border border-gray-700/50 bg-[#1a1a3e] p-4 transition hover:border-purple-500/30"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      user.role === "SUPERVISOR"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-400">CUG: {user.cugSuffix}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          user.role === "SUPERVISOR"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-purple-500/10 text-purple-400"
                        }`}
                      >
                        {user.role}
                      </span>
                      <span className="text-xs text-gray-500">{user.region || "—"}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openResetModal(user.cugSuffix)}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-700 bg-[#252550] px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-[#1a1a3e] py-16">
          <UserCog className="h-12 w-12 text-gray-600" />
          <p className="mt-4 text-sm text-gray-500">No users found matching your search.</p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-2 text-xs text-purple-400 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !resetSuccess && setShowResetModal(false)}
          />
          <div className="relative w-full max-w-md animate-scale-in rounded-2xl border border-gray-700 bg-[#1a1a3e] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <KeyRound className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Reset Password</h3>
                <p className="text-xs text-gray-400">CUG: {resettingCug}</p>
              </div>
            </div>

            {resetSuccess ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="mt-2 text-sm font-medium text-emerald-400">{resetSuccess}</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setStatus("idle");
                      setResetError("");
                    }}
                    placeholder="Enter new password (min 6 chars)"
                    className={`h-12 w-full rounded-xl border bg-[#252550] px-4 text-sm text-white placeholder-gray-500 outline-none transition ${
                      status === "error"
                        ? "border-red-500/50 ring-1 ring-red-500/30"
                        : "border-gray-700 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                    }`}
                  />
                  {resetError && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                      {resetError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 h-11 rounded-xl border border-gray-700 bg-[#252550] text-sm font-medium text-gray-300 transition hover:bg-[#2f2f60]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={status === "loading"}
                    className={`flex-1 h-11 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      status === "success"
                        ? "bg-emerald-600"
                        : "bg-amber-600 hover:bg-amber-700"
                    }`}
                  >
                    {status === "loading" ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
