import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Activity } from "@/lib/models/Activity";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { isValidDateStr, getNowLocalISO } from "@/lib/time-utils";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const limit = Math.min(Number(searchParams.get("limit")) || 15, 50);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (type) {
      filter.type = type;
    }

    // DSE only sees their own activities
    if (user.role === "DSE") {
      filter.userId = user.userId;
    }

    // Supervisor only sees activities from DSEs on their team
    if (user.role === "SUPERVISOR") {
      const teamDses = await User.find({ role: "DSE", supervisor: user.name }).select("name _id").lean();
      const dseNames = teamDses.map((d) => d.name);
      const dseUserIds = teamDses.map((d) => String(d._id));
      if (dseNames.length > 0) {
        // Use userId for reliable matching (works even before dseName backfill)
        filter.userId = { $in: dseUserIds };
      } else {
        return Response.json({ activities: [] });
      }
    }

    const activities = await Activity.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    // Fix old "Just now" timestamps
    const fixedActivities = activities.map((a) => ({
      ...a,
      time: isValidDateStr(a.time)
        ? a.time
        : a.createdAt instanceof Date
          ? a.createdAt.toISOString()
          : getNowLocalISO(),
    }));

    // Batch backfill dseName for old activities — single query for all missing names
    const missingDseNames = fixedActivities.filter((a) => !a.dseName && a.userId);
    if (missingDseNames.length > 0) {
      const userIds = [...new Set(missingDseNames.map((a) => a.userId))];
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const nameByUserId = new Map(users.map((u) => [String(u._id), u.name]));

      for (const a of fixedActivities) {
        if (!a.dseName && a.userId) {
          const userName = nameByUserId.get(String(a.userId));
          if (userName) {
            a.dseName = userName;
            // Persist backfill for next time (fire-and-forget)
            Activity.findByIdAndUpdate(a._id, { $set: { dseName: userName } }).catch(() => {});
          }
        }
      }
    }

    return Response.json({ activities: fixedActivities });
  } catch (error) {
    console.error("Get activities error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
