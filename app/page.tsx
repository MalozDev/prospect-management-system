"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getStoredApiUser } from "@/lib/api-client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    // User has a token — redirect to their appropriate dashboard
    const apiUser = getStoredApiUser();
    if (apiUser?.role === "SUPERADMIN") {
      router.replace("/developer/dashboard");
    } else if (apiUser?.role === "SUPERVISOR") {
      router.replace("/supervisor/dashboard");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#f8f8f8]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#E60012]" />
    </div>
  );
}
