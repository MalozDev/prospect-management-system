import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const supervisors = await User.find({ role: "SUPERVISOR" })
      .select("name cugSuffix region")
      .sort({ name: 1 })
      .lean();

    return Response.json({ supervisors });
  } catch (error) {
    console.error("Get supervisors error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
