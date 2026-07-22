import { connectToDatabase } from "./mongodb";
import { Notification } from "./models/Notification";
import { User } from "./models/User";
import { sendPushToUser } from "./push-notification";
import { getNowLocalISO } from "./time-utils";
import { emitSseEvent } from "./notification-events";

interface NotificationPayload {
  title: string;
  message: string;
  userId: string;
  url?: string;
  tag?: string;
}

/**
 * Create an in-app notification AND send a browser push notification
 * to the specified user. Fire-and-forget — never throws.
 */
export async function sendNotification(payload: NotificationPayload) {
  try {
    await connectToDatabase();

    console.log("[SEND-NOTIF-DEBUG] Creating in-app notification for user:", payload.userId);
    console.log("[SEND-NOTIF-DEBUG] Title:", payload.title);
    console.log("[SEND-NOTIF-DEBUG] Message:", payload.message);

    // Create in-app notification
    const notification = await Notification.create({
      title: payload.title,
      message: payload.message,
      time: getNowLocalISO(),
      unread: true,
      userId: payload.userId,
    });

    console.log("[SEND-NOTIF-DEBUG] ✅ In-app notification created, _id:", String(notification._id));

    // Emit SSE event for real-time badge update (non-blocking)
    // Count unread notifications for the user to include in the event
    Notification.countDocuments({
      userId: payload.userId,
      unread: true,
    }).then((count) => {
      console.log("[SEND-NOTIF-DEBUG] Emitting SSE event — unread count:", count);
      emitSseEvent(payload.userId, "notification", {
        unreadCount: count,
        notification: {
          id: String(notification._id),
          title: payload.title,
          message: payload.message,
          url: payload.url,
        },
      });
    }).catch((err) => {
      console.error("[SEND-NOTIF-DEBUG] SSE emit failed:", err);
    });

    // Send browser push (non-blocking, fire-and-forget)
    console.log("[SEND-NOTIF-DEBUG] Calling sendPushToUser for user:", payload.userId);
    sendPushToUser(payload.userId, {
      title: payload.title,
      message: payload.message,
      url: payload.url || "/",
      tag: payload.tag || "default",
    }).then((result) => {
      console.log("[SEND-NOTIF-DEBUG] sendPushToUser result:", JSON.stringify(result));
    }).catch((err) => {
      console.error("[SEND-NOTIF-DEBUG] sendPushToUser rejected:", err);
    });
  } catch (error) {
    console.error("[SEND-NOTIF-DEBUG] sendNotification error:", error);
    if (error instanceof Error) {
      console.error("[SEND-NOTIF-DEBUG] Error stack:", error.stack);
    }
  }
}

/**
 * Get the MongoDB _id of the supervisor assigned to a DSE.
 * Returns null if the DSE has no supervisor or the supervisor can't be found.
 */
export async function getSupervisorUserId(dseName: string): Promise<string | null> {
  try {
    await connectToDatabase();
    const dse = await User.findOne({ name: dseName, role: "DSE" }).lean();
    if (!dse || !dse.supervisor) return null;

    const supervisor = await User.findOne({ name: dse.supervisor, role: "SUPERVISOR" }).lean();
    return supervisor ? String(supervisor._id) : null;
  } catch {
    return null;
  }
}

/**
 * Get the MongoDB _id of all superadmin users.
 * Used to notify superadmins about system-wide events.
 */
export async function getAllSuperadminUserIds(): Promise<string[]> {
  try {
    await connectToDatabase();
    const superadmins = await User.find({ role: "SUPERADMIN" }).select("_id").lean();
    return superadmins.map((u) => String(u._id));
  } catch {
    return [];
  }
}

/**
 * Send a notification to all superadmin users.
 * Fire-and-forget — never throws.
 */
export async function notifyAllSuperadmins(payload: {
  title: string;
  message: string;
  url?: string;
  tag?: string;
}) {
  try {
    const superadminIds = await getAllSuperadminUserIds();
    if (superadminIds.length === 0) return;

    for (const userId of superadminIds) {
      sendNotification({
        title: payload.title,
        message: payload.message,
        userId,
        url: payload.url || "/developer/dashboard",
        tag: payload.tag || "system",
      }).catch(() => {});
    }
  } catch {
    // Silent fail
  }
}
