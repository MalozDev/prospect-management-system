import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const admin = getUserFromRequest(request);
  if (!admin || admin.role !== "SUPERADMIN") {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const { cugSuffix, newPassword } = await request.json();

    if (!cugSuffix?.trim()) {
      return Response.json({ error: "CUG suffix is required." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return Response.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }

    const dbUser = await User.findOne({ cugSuffix: cugSuffix.trim() });
    if (!dbUser) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    dbUser.password = newPassword;
    await dbUser.save();

    return Response.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
