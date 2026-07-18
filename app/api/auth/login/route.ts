import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { cugSuffix, password } = await request.json();

    if (!cugSuffix?.trim() || !password) {
      return Response.json({ error: "CUG suffix and password are required." }, { status: 400 });
    }

    const user = await User.findOne({ cugSuffix: cugSuffix.trim() });
    if (!user) {
      return Response.json({ error: "Invalid CUG suffix or password." }, { status: 401 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return Response.json({ error: "Invalid CUG suffix or password." }, { status: 401 });
    }

    const token = signToken({
      userId: user._id.toString(),
      cugSuffix: user.cugSuffix,
      role: user.role,
      name: user.name,
    });

    return Response.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        cugSuffix: user.cugSuffix,
        role: user.role,
        region: user.region,
        supervisor: user.supervisor,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
