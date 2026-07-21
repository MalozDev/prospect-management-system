import { invalidatePrefix, clearAllCaches } from "./api-cache";

const API_TOKEN_KEY = "crm-auth-token";
const API_USER_KEY = "crm-api-user";

/** Auto-refresh when token has less than this many days before expiry. */
const REFRESH_THRESHOLD_DAYS = 7;

/** In-flight refresh promise so concurrent calls share one refresh. */
let refreshPromise: Promise<boolean> | null = null;

export interface ApiUser {
  id: string;
  name: string;
  cugSuffix: string;
  role: "DSE" | "SUPERVISOR" | "SUPERADMIN";
  region: string;
  supervisor: string;
  avatarUrl?: string;
  avatarColor?: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(API_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(API_TOKEN_KEY);
  localStorage.removeItem(API_USER_KEY);
  localStorage.removeItem("crm-profile");
  // Clear all API caches on logout
  clearAllCaches();
}

export function getStoredApiUser(): ApiUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(API_USER_KEY);
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function setStoredApiUser(user: ApiUser): void {
  localStorage.setItem(API_USER_KEY, JSON.stringify(user));
}

/** Derive the cache prefix to invalidate after a write operation.
 *  E.g. /api/prospects/xxx → /api/prospects, /api/followups/xxx → /api/followups */
function getCachePrefix(url: string): string {
  // Strip query params
  const path = url.split("?")[0];
  // Strip trailing ID segments (MongoDB ObjectId or any last segment)
  const parts = path.split("/");
  // If the last segment looks like an ID (24 hex chars or not a known resource name), remove it
  const resourceNames = new Set(["prospects", "sales", "followups", "activities", "notifications", "users"]);
  if (parts.length >= 4 && !resourceNames.has(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join("/");
}

/** Invalidate caches related to a mutation URL.
 *  E.g. after PATCH /api/followups/abc, invalidate all /api/followups caches */
function invalidateAfterMutation(url: string): void {
  const prefix = getCachePrefix(url);
  invalidatePrefix(prefix);
}

/**
 * Decode the JWT payload (client-side, no verification needed) to read `exp`.
 * Returns the expiry timestamp in seconds, or null if decoding fails.
 */
function getJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.exp as number) ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a token is close to expiry and should be refreshed.
 */
function shouldRefreshToken(token: string): boolean {
  const exp = getJwtExp(token);
  if (!exp) return false;
  // Refresh if token expires within REFRESH_THRESHOLD_DAYS
  const thresholdMs = REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  return exp * 1000 - Date.now() < thresholdMs;
}

/**
 * Silently refresh the JWT token by calling /api/auth/refresh.
 * Returns true if refresh succeeded, false otherwise.
 */
async function doRefreshToken(): Promise<boolean> {
  try {
    const oldToken = getToken();
    if (!oldToken) return false;

    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oldToken}`,
      },
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      if (data.user) {
        setStoredApiUser(data.user);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Refresh the token, deduplicating concurrent calls.
 */
async function refreshToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function handleUnauthorized(retried: boolean) {
  // Try to refresh the token first before logging out
  if (!retried) {
    const refreshed = await refreshToken();
    if (refreshed) return; // Caller will retry
  }

  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
  throw new Error("Session expired. Please login again.");
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getToken();

  // ── Auto-refresh if token is close to expiry ──
  if (token && shouldRefreshToken(token)) {
    await refreshToken();
    token = getToken(); // Get the new token
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // ── Handle 401 by refreshing once, then retry ──
  if (response.status === 401 && token) {
    await handleUnauthorized(false);
    // If we refreshed, retry the original request with the new token
    const newToken = getToken();
    if (newToken && newToken !== token) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, {
        ...options,
        headers,
      });
      if (retryRes.ok) {
        const method = (options.method || "GET").toUpperCase();
        if (method !== "GET") {
          invalidateAfterMutation(url);
        }
        return retryRes.json();
      }
      // Retry also failed — session is truly expired
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please login again.");
    }
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorBody.error || `HTTP ${response.status}`);
  }

  // After successful write operations, invalidate related caches
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET") {
    invalidateAfterMutation(url);
  }

  return response.json();
}

// Auth calls
export async function loginApi(
  cugSuffix: string,
  password: string
): Promise<{ token: string; user: ApiUser }> {
  const data = await apiFetch<{ token: string; user: ApiUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ cugSuffix, password }),
  });
  return data;
}

export async function registerApi(params: {
  name: string;
  cugSuffix: string;
  password: string;
  role: string;
  region: string;
  supervisor?: string;
}): Promise<{ token: string; user: ApiUser }> {
  const data = await apiFetch<{ token: string; user: ApiUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return data;
}
