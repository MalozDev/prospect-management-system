import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== "SUPERVISOR") {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    // Fetch DSE users assigned to this supervisor
    const dseUsers = await User.find({
      role: "DSE",
      supervisor: user.name,
    })
      .select("-password")
      .sort({ name: 1 })
      .lean();

    return Response.json({ dseUsers });
  } catch (error) {
    console.error("Get supervisor DSEs error:", error);
    return Response.json({ error: "Failed to fetch DSE users." }, { status: 500 });
  }
}
