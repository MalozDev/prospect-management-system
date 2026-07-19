import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Activity } from "@/lib/models/Activity";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { isValidDateStr } from "@/lib/time-utils";

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

    const activities = await Activity.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    // Migrate old "Just now" entries — use createdAt as the real timestamp
    const fixedActivities = activities.map((a) => ({
      ...a,
      time: isValidDateStr(a.time)
        ? a.time
        : a.createdAt instanceof Date
          ? a.createdAt.toISOString()
          : new Date().toISOString(),
    }));

    return Response.json({ activities: fixedActivities });
  } catch (error) {
    console.error("Get activities error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}


