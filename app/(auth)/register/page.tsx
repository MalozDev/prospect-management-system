import Link from "next/link";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import SupervisorSelect from "@/components/forms/SupervisorSelect";
import PrimaryButton from "@/components/forms/PrimaryButton";

import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <Logo />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Join the DSE platform in just a few steps
        </p>
      </div>

      <form className="space-y-5">

        <div>
          <label className="mb-2 block text-sm font-medium">
            Full Name
          </label>

          <Input
            placeholder="Enter your full name"
            className="h-12 rounded-xl"
          />
        </div>

        <CugInput />

        <SupervisorSelect />

        <PasswordInput label="Password" />

        <PasswordInput label="Confirm Password" />

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