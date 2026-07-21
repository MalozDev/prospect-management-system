import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET ?? "prospect-management-secret-key-change-in-production";

export type UserRole = "DSE" | "SUPERVISOR" | "SUPERADMIN";

export interface JwtPayload {
  userId: string;
  cugSuffix: string;
  role: UserRole;
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "365d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Decode a JWT without checking expiry.
 * Used by the refresh endpoint so it can issue a new token
 * even when the current one has already expired.
 */
export function decodeTokenIgnoreExpiry(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

export function getUserFromRequest(request: NextRequest): JwtPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
