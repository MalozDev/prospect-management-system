import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { getNowLocalISO } from "@/lib/time-utils";

/**
 * Lightweight heartbeat endpoint.
 *
 * Called periodically by the client (every 2 minutes) to update the
 * user's `lastActiveAt` timestamp, enabling the system to track who
 * is actively using the app right now.
 *
 * The response is minimal — just a timestamp — to keep overhead near zero.
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    await User.findByIdAndUpdate(user.userId, {
      $set: { lastActiveAt: getNowLocalISO() },
    });

    return Response.json({ ok: true, t: getNowLocalISO() });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
