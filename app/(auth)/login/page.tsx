"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import { loginApi, setToken, setStoredApiUser, apiFetch } from "@/lib/api-client";
import { saveProfile } from "@/utils/profile";

type Status = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [cug, setCug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [loadingForgot, setLoadingForgot] = useState(false);

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
      if (e.key === "Escape") setShowForgotModal(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

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
        avatarUrl: "",
      });
      window.dispatchEvent(new Event("profile-updated"));

      // Show success state before redirect
      setStatus("success");
      setTimeout(() => {
        if (data.user.role === "SUPERADMIN") {
          router.push("/developer/dashboard");
        } else if (data.user.role === "SUPERVISOR") {
          router.push("/supervisor/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setStatus("error");
    }
  };

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
    </>
  );
}
