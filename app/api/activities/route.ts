import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Activity } from "@/lib/models/Activity";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

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

    return Response.json({ activities });
  } catch (error) {
    console.error("Get activities error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
