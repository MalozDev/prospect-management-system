import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { signToken } from "@/lib/auth";
import { getSupervisorUserId, sendNotification, notifyAllSuperadmins } from "@/lib/send-notification";
import { defer } from "@/lib/defer";

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

    const supervisorCount = role === "DSE" && !supervisor?.trim()
      ? await User.countDocuments({ role: "SUPERVISOR" })
      : 0;

    // ═══ CRITICAL PATH: create user ═══
    const user = await User.create({
      name: name.trim(),
      cugSuffix: cugSuffix.trim(),
      password,
      role,
      region: region || "Lusaka",
      supervisor: supervisor || "",
      supervisorCheckedAt: supervisorCount,
    });

    // ═══ RESPOND IMMEDIATELY ═══
    const token = signToken({
      userId: user._id.toString(),
      cugSuffix: user.cugSuffix,
      role: user.role,
      name: user.name,
    });

    const response = Response.json(
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

    // ═══ DEFERRED SIDE EFFECTS ═══
    defer(async () => {
      if (role === "DSE" && supervisor?.trim()) {
        const supervisorUserId = await getSupervisorUserId(name.trim());
        if (supervisorUserId) {
          await sendNotification({
            title: "New DSE on your team",
            message: `${name.trim()} has joined your team as a Direct Sales Executive.`,
            userId: supervisorUserId,
            url: "/supervisor/dse",
            tag: "team-join",
          });
        }
      }

      if (role === "SUPERVISOR") {
        const waitingDses = await User.find({
          role: "DSE",
          supervisor: "NOT_ON_BOARD",
        }).select("_id name").lean();

        if (waitingDses.length > 0) {
          for (const dse of waitingDses) {
            await sendNotification({
              title: "Supervisor available!",
              message: `${name.trim()} has registered as a Supervisor. You can now select your supervisor in Settings.`,
              userId: String(dse._id),
              url: "/dashboard",
              tag: "supervisor-available",
            });
          }
        }
      }

      await notifyAllSuperadmins({
        title: `New ${role === "DSE" ? "DSE" : "Supervisor"} registered`,
        message: `${name.trim()} registered as a ${role === "DSE" ? "Direct Sales Executive" : "Supervisor"} (CUG: ${cugSuffix}).`,
        url: role === "DSE" ? "/developer/dse" : "/developer/users",
        tag: "user-registration",
      });
    }, request.signal);

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
