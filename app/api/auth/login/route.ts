import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { signToken } from "@/lib/auth";
import { getTodayLocal, getNowLocalISO } from "@/lib/time-utils";

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

    // Track last login for "active today" tracking
    const today = getTodayLocal();
    await User.findByIdAndUpdate(user._id, {
      $set: { lastLogin: getNowLocalISO() },
    });

    // ── Smart supervisor check ──
    // Determine if the DSE needs to select a supervisor.
    // "NOT_ON_BOARD" means they already chose "not on board" previously.
    // If new supervisors have appeared since then, re-prompt them.
    let needsSupervisor = false;
    if (user.role === "DSE") {
      const sup = user.supervisor || "";
      if (!sup || sup === "UNASSIGNED") {
        // First time or never properly set — always prompt
        needsSupervisor = true;
      } else if (sup === "NOT_ON_BOARD") {
        // Previously chose "not on board" — check if new supervisors appeared
        const currentCount = await User.countDocuments({ role: "SUPERVISOR" });
        if (currentCount > (user.supervisorCheckedAt || 0)) {
          needsSupervisor = true;
        }
      }
    }

    const token = signToken({
      userId: user._id.toString(),
      cugSuffix: user.cugSuffix,
      role: user.role,
      name: user.name,
    });

    return Response.json({
      token,
      needsSupervisor,
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
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
