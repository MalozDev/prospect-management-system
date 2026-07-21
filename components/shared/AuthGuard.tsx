"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken, setStoredApiUser } from "@/lib/api-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      // Silently refresh the token on page load to handle the case where
      // the token was valid localStorage but has since expired (user was away
      // for weeks/months). The refresh endpoint accepts expired tokens.
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.token) {
            setToken(data.token);
            if (data.user) {
              setStoredApiUser(data.user);
            }
          }
        } else if (!cancelled) {
          // Refresh failed — token is truly invalid, redirect to login
          router.replace("/login");
          return;
        }
      } catch {
        if (!cancelled) {
          // Network error — still allow access if we have a cached token
          // It might work once the connection is back
        }
      }

      if (!cancelled) {
        setAuthorized(true);
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f8f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#E60012]" />
      </div>
    );
  }

  return <>{children}</>;
}
