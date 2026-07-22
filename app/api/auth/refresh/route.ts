import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { signToken, getTokenFromRequest, decodeTokenIgnoreExpiry, unauthorizedResponse } from "@/lib/auth";
import { getNowLocalISO } from "@/lib/time-utils";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return unauthorizedResponse();

    // Use decodeTokenIgnoreExpiry so we can refresh even if the token
    // has already expired (e.g. user opens app after weeks away)
    const payload = decodeTokenIgnoreExpiry(token);
    if (!payload) return unauthorizedResponse();

    await connectToDatabase();

    // Verify the user still exists in the database
    const dbUser = await User.findById(payload.userId).lean();
    if (!dbUser) {
      return Response.json({ error: "User not found." }, { status: 401 });
    }

    // ── Heartbeat: mark this user as active right now ──
    // Token refresh fires on every page load and API re-auth,
    // so it's the most reliable "user is active" signal.
    // Fire-and-forget — non-critical if this update fails.
    User.findByIdAndUpdate(payload.userId, {
      $set: { lastActiveAt: getNowLocalISO() },
    }).catch(() => {});

    // Issue a fresh token with a new 1-year expiry
    const newToken = signToken({
      userId: payload.userId,
      cugSuffix: payload.cugSuffix,
      role: payload.role,
      name: payload.name,
    });

    return Response.json({
      token: newToken,
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        cugSuffix: dbUser.cugSuffix,
        role: dbUser.role,
        region: dbUser.region,
        supervisor: dbUser.supervisor,
        avatarUrl: dbUser.avatarUrl || "",
        avatarColor: dbUser.avatarColor || "",
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
