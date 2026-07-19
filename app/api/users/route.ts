import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== "SUPERADMIN") {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return Response.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}
