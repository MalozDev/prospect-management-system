"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquareText,
  Save,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";

import { apiFetch, getToken } from "@/lib/api-client";

export default function DeveloperSettingsPage() {
  const [forgotMessage, setForgotMessage] = useState("");
  const [originalMessage, setOriginalMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Load current message
  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ message: string }>("/api/settings/forgot-password");
        setForgotMessage(data.message);
        setOriginalMessage(data.message);
      } catch {
        setForgotMessage("Failed to load message.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = useCallback(async () => {
    if (!forgotMessage.trim()) {
      setStatus("error");
      setMessage("Message cannot be empty.");
      return;
    }

    setSaving(true);
    setStatus("idle");

    try {
      await apiFetch("/api/settings/forgot-password", {
        method: "POST",
        body: JSON.stringify({ message: forgotMessage.trim() }),
      });
      setOriginalMessage(forgotMessage.trim());
      setStatus("success");
      setMessage("Forgot-password message updated successfully!");
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [forgotMessage]);

  const hasChanges = forgotMessage !== originalMessage;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">System Settings</h2>
        <p className="mt-1 text-sm text-gray-400">
          Configure global system settings and messages.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Forgot Password Message */}
        <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <MessageSquareText className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Forgot Password Message</h3>
              <p className="text-xs text-gray-400">
                This message is shown when users click &quot;Forgot Password?&quot;
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-purple-500" />
            </div>
          ) : (
            <>
              <textarea
                value={forgotMessage}
                onChange={(e) => {
                  setForgotMessage(e.target.value);
                  setStatus("idle");
                  setMessage("");
                }}
                rows={4}
                className="w-full rounded-xl border border-gray-700 bg-[#252550] p-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 resize-none"
              />

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {hasChanges ? "You have unsaved changes" : "Saved"}
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    status === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>

              {status === "success" && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs text-emerald-400">{message}</p>
                </div>
              )}

              {status === "error" && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <p className="text-xs text-red-400">{message}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* System Info */}
        <div className="rounded-2xl border border-gray-700/50 bg-[#1a1a3e] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">System Info</h3>
              <p className="text-xs text-gray-400">Developer &amp; platform details</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl bg-[#252550] p-3">
              <p className="text-xs text-gray-400">SuperAdmin CUG</p>
              <p className="mt-1 text-sm font-medium text-white">2288</p>
            </div>
            <div className="rounded-xl bg-[#252550] p-3">
              <p className="text-xs text-gray-400">Database</p>
              <p className="mt-1 text-sm font-medium text-white">MongoDB Atlas</p>
            </div>
            <div className="rounded-xl bg-[#252550] p-3">
              <p className="text-xs text-gray-400">Total Users</p>
              <p className="mt-1 text-sm font-medium text-white">Fetched from database</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
