"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import SupervisorSelect from "@/components/forms/SupervisorSelect";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { registerApi, setToken, setStoredApiUser } from "@/lib/api-client";
import { saveProfile } from "@/utils/profile";
import { subscribeToPush } from "@/lib/push-subscribe";

type Status = "idle" | "loading" | "success" | "error";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cugSuffix, setCugSuffix] = useState("");
  const [role, setRole] = useState("DSE");
  const [supervisor, setSupervisor] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [region, setRegion] = useState("Lusaka");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Auto-reset error state after 4 seconds
  useEffect(() => {
    if (status === "error") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setError("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const resetStatus = useCallback(() => {
    setStatus("idle");
    setError("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("idle");

    if (!name.trim()) {
      setError("Please enter your full name.");
      setStatus("error");
      return;
    }
    if (!cugSuffix || cugSuffix.length < 4) {
      setError("Please enter a valid 4-digit CUG number.");
      setStatus("error");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setStatus("error");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const data = await registerApi({
        name: name.trim(),
        cugSuffix: cugSuffix.trim(),
        password,
        role,
        region,
        supervisor: role === "DSE" ? supervisor : undefined,
      });

      // Store auth token
      setToken(data.token);
      setStoredApiUser(data.user);

      // Save profile for UI
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

      // Show success state before redirect
      setStatus("success");
      setTimeout(() => {
        if (data.user.role === "SUPERVISOR") {
          router.push("/supervisor/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      setStatus("error");
    }
  };

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <Logo />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Join the CRM platform in just a few steps
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Full Name
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); resetStatus(); }}
            placeholder="Enter your full name"
            className="h-12 rounded-xl bg-white border-gray-300"
          />
        </div>

        <CugInput value={cugSuffix} onChange={(value) => { setCugSuffix(value); resetStatus(); }} />

        <div>
          <label className="mb-2 block text-sm font-medium">
            Role
          </label>
          <Select
            value={role}
            onChange={(e) => { setRole(e.target.value); resetStatus(); }}
            className="h-12 rounded-xl"
          >
            <option value="DSE">Direct Sales Executive (DSE)</option>
            <option value="SUPERVISOR">Supervisor</option>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Region
          </label>
          <Select
            value={region}
            onChange={(e) => { setRegion(e.target.value); resetStatus(); }}
            className="h-12 rounded-xl"
          >
            <option value="Lusaka">Lusaka</option>
            <option value="Copperbelt">Copperbelt</option>
            <option value="Southern">Southern</option>
            <option value="Northern">Northern</option>
            <option value="Eastern">Eastern</option>
          </Select>
        </div>

        {role === "DSE" && (
          <SupervisorSelect value={supervisor} onChange={(value) => { setSupervisor(value); resetStatus(); }} />
        )}

        <PasswordInput label="Password" value={password} onChange={(value) => { setPassword(value); resetStatus(); }} />

        <PasswordInput label="Confirm Password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); resetStatus(); }} />

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
              <span>Creating account...</span>
            </>
          ) : status === "success" ? (
            <>
              <span className="animate-scale-in inline-flex items-center gap-2">
                <svg className="h-5 w-5 animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Account Created!
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
            "Create Account"
          )}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#E60012] hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
