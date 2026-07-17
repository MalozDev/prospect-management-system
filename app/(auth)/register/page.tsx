"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import SupervisorSelect from "@/components/forms/SupervisorSelect";
import PrimaryButton from "@/components/forms/PrimaryButton";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

  const handleSubmit = (e: React.FormEvent) => {
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

    // Save to list of registered users in localStorage
    const storedUsersRaw = localStorage.getItem("crm-registered-users") || "[]";
    let users: { cugSuffix: string }[] = [];
    try {
      users = JSON.parse(storedUsersRaw);
    } catch {
      users = [];
    }

    // Check if CUG already registered
    if (users.some((u) => u.cugSuffix === cugSuffix)) {
      setError("This CUG suffix is already registered.");
      return;
    }

    const newUser = {
      name,
      cugSuffix,
      role,
      supervisor: role === "DSE" ? supervisor : undefined,
      region,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem("crm-registered-users", JSON.stringify(users));

    // Save as active profile
    saveProfile({
      name,
      role: role === "SUPERVISOR" ? "Supervisor" : "Direct Sales Executive",
      phone: `097898${cugSuffix}`,
      region,
      cug: `097898${cugSuffix}`,
      avatarUrl: "",
    });
    window.dispatchEvent(new Event("profile-updated"));

    // Redirect based on role
    if (role === "SUPERVISOR") {
      router.push("/supervisor/dashboard");
    } else {
      router.push("/dashboard");
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
          Join the crm platform in just a few steps
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

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

        <PrimaryButton type="submit">
          Create Account
        </PrimaryButton>

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