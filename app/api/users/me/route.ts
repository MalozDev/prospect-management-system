import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { sendNotification } from "@/lib/send-notification";
import { defer } from "@/lib/defer";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const dbUser = await User.findById(user.userId).lean();

    if (!dbUser) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        cugSuffix: dbUser.cugSuffix,
        role: dbUser.role,
        region: dbUser.region,
        supervisor: dbUser.supervisor,
        supervisorCheckedAt: dbUser.supervisorCheckedAt || 0,
        avatarUrl: dbUser.avatarUrl || "",
        avatarColor: dbUser.avatarColor || "",
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await request.json();
    const allowedFields = ["name", "region", "avatarUrl", "avatarColor", "supervisor", "supervisorCheckedAt"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const dbUser = await User.findByIdAndUpdate(user.userId, { $set: updates }, { new: true }).lean();

    if (!dbUser) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // ═══ RESPOND IMMEDIATELY ═══
    const response = Response.json({
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        cugSuffix: dbUser.cugSuffix,
        role: dbUser.role,
        region: dbUser.region,
        supervisor: dbUser.supervisor,
        supervisorCheckedAt: dbUser.supervisorCheckedAt || 0,
        avatarUrl: dbUser.avatarUrl || "",
        avatarColor: dbUser.avatarColor || "",
      },
    });

    // ═══ DEFERRED: notify supervisor when a DSE assigns them ═══
    if (body.supervisor && typeof body.supervisor === "string") {
      const newSup = body.supervisor.trim();
      const isRealSupervisor = newSup && newSup !== "UNASSIGNED" && newSup !== "NOT_ON_BOARD";
      if (isRealSupervisor) {
        defer(async () => {
          const supervisorUser = await User.findOne({
            name: newSup,
            role: "SUPERVISOR",
          }).lean();
          if (supervisorUser) {
            await sendNotification({
              title: "New DSE on your team",
              message: `${user.name} has joined your team as a Direct Sales Executive.`,
              userId: String(supervisorUser._id),
              url: "/supervisor/dse",
              tag: "team-join",
            });
          }
        }, request.signal);
      }
    }

    return response;
  } catch (error) {
    console.error("Update user error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
