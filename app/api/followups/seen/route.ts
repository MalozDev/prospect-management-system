import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FollowUp } from "@/lib/models/FollowUp";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { getNowLocalISO } from "@/lib/time-utils";

/**
 * POST /api/followups/seen
 *
 * Marks ALL follow-ups assigned to the current DSE as "seen"
 * by setting `followUpSeenAt` to the current timestamp.
 *
 * Called when the DSE navigates to their followups page,
 * indicating they have viewed/opened the app to see their followups.
 *
 * This allows the supervisor/developer to know the DSE has
 * acknowledged their follow-up assignments.
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const now = getNowLocalISO();
    const dseName = user.name;
    const role = user.role;

    // Build filter: only mark followups assigned to this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (role === "DSE") {
      filter.assignedDse = dseName;
    } else if (role === "SUPERVISOR") {
      // Can also mark seen for team members if needed
      const teamDses = await User.find({ role: "DSE", supervisor: user.name }).select("name").lean();
      const dseNames = teamDses.map((d) => d.name);
      if (dseNames.length > 0) {
        filter.assignedDse = { $in: dseNames };
      } else {
        return Response.json({ ok: true, marked: 0 });
      }
    }

    // Only mark followups that haven't been seen yet
    filter.followUpSeenAt = "";

    const result = await FollowUp.updateMany(filter, {
      $set: { followUpSeenAt: now },
    });

    console.log(`[SEEN] Marked ${result.modifiedCount} followups as seen for ${dseName}`);

    return Response.json({
      ok: true,
      marked: result.modifiedCount,
      now,
      dseName,
    });
  } catch (error) {
    console.error("[SEEN] Error marking followups as seen:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
