"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import SupervisorSelect from "@/components/forms/SupervisorSelect";
import { loginApi, setToken, setStoredApiUser, apiFetch, getStoredApiUser, getToken } from "@/lib/api-client";
import { saveProfile } from "@/utils/profile";
import { subscribeToPush } from "@/lib/push-subscribe";

type Status = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();

  // ── All useState hooks MUST be before any early return ──
  const [cug, setCug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [checkingSession, setCheckingSession] = useState(true);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [loadingForgot, setLoadingForgot] = useState(false);

  // Supervisor selection prompt
  const [showSupervisorPrompt, setShowSupervisorPrompt] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [savingSupervisor, setSavingSupervisor] = useState(false);
  const [supervisorPromptError, setSupervisorPromptError] = useState("");
  const [redirectAfterPrompt, setRedirectAfterPrompt] = useState("");

  // ── All useEffect hooks MUST be before any early return ──

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }

    const apiUser = getStoredApiUser();
    if (apiUser?.role === "SUPERADMIN") {
      router.replace("/developer/dashboard");
    } else if (apiUser?.role === "SUPERVISOR") {
      router.replace("/supervisor/dashboard");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  // Auto-reset error state after 2 seconds
  useEffect(() => {
    if (status === "error") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setError("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowForgotModal(false);
        setShowSupervisorPrompt(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  // ── All useCallback hooks ──
  const handleCugChange = useCallback((value: string) => {
    setCug(value);
    setStatus("idle");
    setError("");
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setStatus("idle");
    setError("");
  }, []);

  // ── Handler functions ──
  const handleForgotPassword = async () => {
    setLoadingForgot(true);
    try {
      const data = await apiFetch<{ message: string }>("/api/settings/forgot-password");
      setForgotMessage(data.message);
    } catch {
      setForgotMessage("Unable to load info. Please contact your supervisor or system administrator.");
    } finally {
      setLoadingForgot(false);
      setShowForgotModal(true);
    }
  };

  const handleSaveSupervisor = async () => {
    if (!selectedSupervisor) {
      setSupervisorPromptError("Please select a supervisor or choose 'Not on board'.");
      return;
    }
    setSavingSupervisor(true);
    setSupervisorPromptError("");
    try {
      // Build update payload
      const payload: Record<string, unknown> = { supervisor: selectedSupervisor };

      // If choosing "Not on board" (value is "UNASSIGNED" from the dropdown),
      // store the current supervisor count so we can detect new supervisors
      // on the next login. Map UNASSIGNED → NOT_ON_BOARD in the backend.
      if (selectedSupervisor === "UNASSIGNED") {
        payload.supervisor = "NOT_ON_BOARD";
        try {
          const supRes = await fetch("/api/supervisors");
          const supData = await supRes.json();
          payload.supervisorCheckedAt = supData.supervisors?.length || 0;
        } catch {
          payload.supervisorCheckedAt = 0;
        }
      }

      // Update supervisor assignment
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Update stored user info
      const apiUser = getStoredApiUser();
      if (apiUser) {
        setStoredApiUser({ ...apiUser, supervisor: selectedSupervisor });
      }

      setShowSupervisorPrompt(false);
      // Navigate to the intended destination
      if (redirectAfterPrompt) {
        router.push(redirectAfterPrompt);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setSupervisorPromptError(err instanceof Error ? err.message : "Failed to save supervisor.");
    } finally {
      setSavingSupervisor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("idle");

    if (!cug || cug.length < 4) {
      setError("Please enter a valid 4-digit CUG number.");
      setStatus("error");
      return;
    }
    if (!password || password.length < 6) {
      setError("Please enter your password.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const data = await loginApi(cug, password);

      // Store auth token
      setToken(data.token);
      setStoredApiUser(data.user);

      // Also save profile for UI components that still use it
      const roleLabel = data.user.role === "SUPERVISOR" ? "Supervisor" : "Direct Sales Executive";
      saveProfile({
        name: data.user.name,
        role: roleLabel,
        phone: `097898${data.user.cugSuffix}`,
        region: data.user.region,
        cug: `097898${data.user.cugSuffix}`,
        avatarUrl: data.user.avatarUrl || "",
      });
      window.dispatchEvent(new Event("profile-updated"));

      // Auto-subscribe to push notifications (non-blocking)
      subscribeToPush().catch(() => {});

      // Check if DSE needs to select a supervisor
      // The API returns needsSupervisor = true when:
      // - DSE has no supervisor (first time)
      // - DSE chose "NOT_ON_BOARD" before but new supervisors have appeared
      const needsSupervisor = data.user.role === "DSE" && (data as any).needsSupervisor === true;

      // Determine redirect destination
      let destination = "";
      if (data.user.role === "SUPERADMIN") {
        destination = "/developer/dashboard";
      } else if (data.user.role === "SUPERVISOR") {
        destination = "/supervisor/dashboard";
      } else {
        destination = "/dashboard";
      }

      // Show success state before redirect or prompt
      setStatus("success");
      setTimeout(() => {
        if (needsSupervisor) {
          // Show supervisor selection prompt instead of redirecting
          setRedirectAfterPrompt(destination);
          setSelectedSupervisor(data.user.supervisor || "");
          setShowSupervisorPrompt(true);
        } else {
          router.push(destination);
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setStatus("error");
    }
  };

  // Show nothing while checking session — EARLY RETURN (only JSX, no hooks below)
  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f8f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#E60012]" />
      </div>
    );
  }

  return (
    <>
      <AuthCard>
        <div className="mb-6 text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to continue to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <CugInput value={cug} onChange={handleCugChange} />

          <PasswordInput value={password} onChange={handlePasswordChange} />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm font-medium text-[#E60012] hover:underline hover:text-red-700 transition-colors"
            >
              {loadingForgot ? "Loading..." : "Forgot Password?"}
            </button>
          </div>

          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className={`h-12 w-full rounded-xl font-medium text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              status === "success"
                ? "bg-green-600 hover:bg-green-700"
                : status === "error"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#E60012] hover:bg-red-700"
            } ${status === "error" ? "animate-shake" : ""}`}
          >
            {status === "loading" ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Signing in...</span>
              </>
            ) : status === "success" ? (
              <>
                <span className="animate-scale-in inline-flex items-center gap-2">
                  <svg className="h-5 w-5 animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Login Successful!
                </span>
              </>
            ) : status === "error" ? (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{error}</span>
              </>
            ) : (
              "Login"
            )}
          </button>

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#E60012] hover:underline"
            >
              Create Account
            </Link>
          </p>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-2">Info: Register first, then login with your CUG suffix and password.</p>
        </div>
      </AuthCard>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowForgotModal(false)}
          />

          {/* Modal */}
          <div role="dialog" aria-modal="true" aria-label="Forgot password" className="relative w-full max-w-md animate-scale-in rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                  <svg className="h-5 w-5 text-[#E60012]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Forgot Password
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800 leading-relaxed">
                {forgotMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="mt-4 h-11 w-full rounded-xl bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Supervisor Selection Prompt */}
      {showSupervisorPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {}}
          />

          {/* Modal */}
          <div role="dialog" aria-modal="true" aria-label="Select supervisor" className="relative w-full max-w-md animate-scale-in rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Select Your Supervisor</h2>
                <p className="text-sm text-gray-500">Choose your supervisor to get started.</p>
              </div>
            </div>

            <div className="mb-4">
              <SupervisorSelect
                value={selectedSupervisor}
                onChange={(value) => {
                  setSelectedSupervisor(value);
                  setSupervisorPromptError("");
                }}
              />
            </div>

            {supervisorPromptError && (
              <p className="mb-3 text-sm text-red-600">{supervisorPromptError}</p>
            )}

            <div className="mt-1 flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <svg className="h-4 w-4 shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                If your supervisor hasn&apos;t registered yet, choose &quot;Supervisor not on board yet&quot;. You can always update this later.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSupervisor}
              disabled={savingSupervisor}
              className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingSupervisor ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Continue to Dashboard"
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
