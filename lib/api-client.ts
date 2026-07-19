const API_TOKEN_KEY = "crm-auth-token";
const API_USER_KEY = "crm-api-user";

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

async function handleUnauthorized() {
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
  const token = getToken();
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

  // Only handle unauthorized redirect when the user was actually authenticated
  // (has a token). Login/register requests get 401 for invalid creds, not expired sessions.
  if (response.status === 401 && token) {
    return handleUnauthorized() as never;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorBody.error || `HTTP ${response.status}`);
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
