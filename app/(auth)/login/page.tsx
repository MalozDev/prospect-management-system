import Link from "next/link";

import AuthCard from "@/components/layout/AuthCard";
import Logo from "@/components/layout/Logo";

import CugInput from "@/components/forms/CugInput";
import PasswordInput from "@/components/forms/PasswordInput";
import PrimaryButton from "@/components/forms/PrimaryButton";

export default function LoginPage() {
  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <Logo />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in to continue to your account
        </p>
      </div>

      <form className="space-y-5">

        <CugInput />

        <PasswordInput />

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
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#E60012] hover:underline"
          >
            Create Account
          </Link>
        </p>

      </form>
    </AuthCard>
  );
}