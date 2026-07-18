"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!cugSuffix || cugSuffix.length < 4) {
      setError("Please enter a valid 4-digit CUG number.");
      return;
    }
    if (role === "DSE" && !supervisor) {
      setError("Please select your supervisor.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
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
        avatarUrl: "",
      });
      window.dispatchEvent(new Event("profile-updated"));

      if (data.user.role === "SUPERVISOR") {
        router.push("/supervisor/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
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
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="h-12 rounded-xl bg-white border-gray-300"
          />
        </div>

        <CugInput value={cugSuffix} onChange={setCugSuffix} />

        <div>
          <label className="mb-2 block text-sm font-medium">
            Role
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
            onChange={(e) => setRegion(e.target.value)}
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
          <SupervisorSelect value={supervisor} onChange={setSupervisor} />
        )}

        <PasswordInput label="Password" value={password} onChange={setPassword} />

        <PasswordInput label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} />

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
              Creating account...
            </>
          ) : error ? (
            <span className="text-sm">{error}</span>
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
