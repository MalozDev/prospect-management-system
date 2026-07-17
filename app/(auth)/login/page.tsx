"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import PrimaryButton from "@/components/forms/PrimaryButton";
import { saveProfile } from "@/utils/profile";

export default function LoginPage() {
  const router = useRouter();
  const [cug, setCug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!cug || cug.length < 4) {
      setError("Please enter a valid 4-digit CUG number.");
      return;
    }

    // Default Pre-configured users
    if (cug === "8888") {
      saveProfile({
        name: "Grace Mulenga",
        role: "Supervisor",
        phone: "0978988888",
        region: "Copperbelt",
        cug: "0978988888",
        avatarUrl: "",
      });
      window.dispatchEvent(new Event("profile-updated"));
      router.push("/supervisor/dashboard");
      return;
    }

    if (cug === "2288") {
      saveProfile({
        name: "Nalu Mwansa",
        role: "Direct Sales Executive",
        phone: "0978982288",
        region: "Lusaka",
        cug: "0978982288",
        avatarUrl: "",
      });
      window.dispatchEvent(new Event("profile-updated"));
      router.push("/dashboard");
      return;
    }

    if (cug === "3344") {
      saveProfile({
        name: "Tebo Chanda",
        role: "Direct Sales Executive",
        phone: "0978983344",
        region: "Kitwe",
        cug: "0978983344",
        avatarUrl: "",
      });
      window.dispatchEvent(new Event("profile-updated"));
      router.push("/dashboard");
      return;
    }

    // Check custom registered users in localStorage
    try {
      const storedUsersRaw = localStorage.getItem("crm-registered-users");
      if (storedUsersRaw) {
        const users = JSON.parse(storedUsersRaw) as { cugSuffix: string; name: string; role: string; region?: string }[];
        const matchedUser = users.find((u) => u.cugSuffix === cug);
        if (matchedUser) {
          saveProfile({
            name: matchedUser.name,
            role: matchedUser.role === "SUPERVISOR" ? "Supervisor" : "Direct Sales Executive",
            phone: `097898${cug}`,
            region: matchedUser.region || "Lusaka",
            cug: `097898${cug}`,
            avatarUrl: "",
          });
          window.dispatchEvent(new Event("profile-updated"));
          
          if (matchedUser.role === "SUPERVISOR") {
            router.push("/supervisor/dashboard");
          } else {
            router.push("/dashboard");
          }
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse custom users", e);
    }

    // Default fallback if not matched: treat as DSE with this CUG
    saveProfile({
      name: `User ${cug}`,
      role: "Direct Sales Executive",
      phone: `097898${cug}`,
      region: "Lusaka",
      cug: `097898${cug}`,
      avatarUrl: "",
    });
    window.dispatchEvent(new Event("profile-updated"));
    router.push("/dashboard");
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

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

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

        <PrimaryButton type="submit">
          Login
        </PrimaryButton>

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
        <p className="font-semibold text-gray-700 mb-2">Test accounts (any password):</p>
        <div className="space-y-1">
          <p>• <span className="font-medium text-[#E60012]">Supervisor:</span> CUG suffix <strong className="text-gray-900">8888</strong> (Grace Mulenga)</p>
          <p>• <span className="font-medium text-[#E60012]">DSE Nalu:</span> CUG suffix <strong className="text-gray-900">2288</strong> (Nalu Mwansa)</p>
          <p>• <span className="font-medium text-[#E60012]">DSE Tebo:</span> CUG suffix <strong className="text-gray-900">3344</strong> (Tebo Chanda)</p>
        </div>
      </div>
    </AuthCard>
  );
}