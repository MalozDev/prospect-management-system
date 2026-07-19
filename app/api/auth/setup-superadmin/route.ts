import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

/**
 * One-time setup: Creates the superAdmin account in the database.
 * Only works in development mode — never called in production.
 * This keeps the superAdmin credentials out of source code.
 */
export async function POST(request: NextRequest) {
  // Safety: only allow in development mode
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Setup is only available in development mode." }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const { cugSuffix, password, name } = await request.json();

    if (!cugSuffix?.trim() || !password || !name?.trim()) {
      return Response.json({ error: "CUG suffix, password, and name are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    // Check if already exists
    const existing = await User.findOne({ cugSuffix: cugSuffix.trim() });
    if (existing) {
      if (existing.role === "SUPERADMIN") {
        return Response.json({ message: "SuperAdmin account already exists." });
      }
      // Update existing user to SUPERADMIN
      existing.role = "SUPERADMIN";
      existing.password = password;
      await existing.save();
      return Response.json({ message: "User updated to SuperAdmin successfully." });
    }

    await User.create({
      name: name.trim(),
      cugSuffix: cugSuffix.trim(),
      password,
      role: "SUPERADMIN",
      region: "System",
      supervisor: "",
    });

    return Response.json({ message: "SuperAdmin account created successfully." });
  } catch (error) {
    console.error("Setup superadmin error:", error);
    return Response.json({ error: "Failed to create superadmin." }, { status: 500 });
  }
}
