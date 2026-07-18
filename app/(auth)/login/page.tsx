"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import { loginApi, setToken, setStoredApiUser } from "@/lib/api-client";
import { saveProfile } from "@/utils/profile";

export default function LoginPage() {
  const router = useRouter();
  const [cug, setCug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!cug || cug.length < 4) {
      setError("Please enter a valid 4-digit CUG number.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
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

      if (data.user.role === "SUPERVISOR") {
        router.push("/supervisor/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <CugInput value={cug} onChange={setCug} />

        <PasswordInput value={password} onChange={setPassword} />

        <div className="flex justify-end">
          <Link
            href="#"
            className="text-sm font-medium text-[#E60012] hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`h-12 w-full rounded-xl font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            error
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[#E60012] hover:bg-red-700"
          }`}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing in...
            </>
          ) : error ? (
            <span className="text-sm">{error}</span>
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
  );
}
