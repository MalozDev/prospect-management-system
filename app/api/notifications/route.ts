import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/lib/models/Notification";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { isValidDateStr } from "@/lib/time-utils";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      userId: user.userId,
    };

    if (unreadOnly) {
      filter.unread = true;
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).lean();

    // Migrate old "Just now" entries — use createdAt as the real timestamp
    const fixedNotifications = notifications.map((n) => ({
      ...n,
      time: isValidDateStr(n.time)
        ? n.time
        : n.createdAt instanceof Date
          ? n.createdAt.toISOString()
          : new Date().toISOString(),
    }));

    return Response.json({ notifications: fixedNotifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await request.json();
    const { title, message, userId: targetUserId } = body;

    if (!title?.trim() || !message?.trim()) {
      return Response.json(
        { error: "Title and message are required." },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      time: new Date().toISOString(),
      unread: true,
      userId: targetUserId || user.userId,
    });

    return Response.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("Create notification error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
