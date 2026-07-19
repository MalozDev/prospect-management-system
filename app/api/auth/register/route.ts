import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { name, cugSuffix, password, role, region, supervisor } = await request.json();

    // Validation
    if (!name?.trim() || !cugSuffix?.trim() || !password || !role) {
      return Response.json({ error: "Name, CUG suffix, password, and role are required." }, { status: 400 });
    }

    if (cugSuffix.length < 4 || cugSuffix.length > 4) {
      return Response.json({ error: "CUG suffix must be exactly 4 digits." }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    if (!["DSE", "SUPERVISOR"].includes(role)) {
      return Response.json({ error: "Role must be DSE or SUPERVISOR." }, { status: 400 });
    }

    // Check for existing user
    const existing = await User.findOne({ cugSuffix });
    if (existing) {
      return Response.json({ error: "This CUG suffix is already registered." }, { status: 409 });
    }

    const user = await User.create({
      name: name.trim(),
      cugSuffix: cugSuffix.trim(),
      password,
      role,
      region: region || "Lusaka",
      supervisor: supervisor || "",
    });

    const token = signToken({
      userId: user._id.toString(),
      cugSuffix: user.cugSuffix,
      role: user.role,
      name: user.name,
    });

    return Response.json(
      {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          cugSuffix: user.cugSuffix,
          role: user.role,
          region: user.region,
          supervisor: user.supervisor,
          avatarUrl: user.avatarUrl || "",
          avatarColor: user.avatarColor || "",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
