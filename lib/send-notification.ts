import { connectToDatabase } from "./mongodb";
import { Notification } from "./models/Notification";
import { User } from "./models/User";
import { sendPushToUser } from "./push-notification";
import { getNowLocalISO } from "./time-utils";

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

    // Create in-app notification
    await Notification.create({
      title: payload.title,
      message: payload.message,
      time: getNowLocalISO(),
      unread: true,
      userId: payload.userId,
    });

    // Send browser push (non-blocking)
    sendPushToUser(payload.userId, {
      title: payload.title,
      message: payload.message,
      url: payload.url || "/",
      tag: payload.tag || "default",
    }).catch(() => {});
  } catch (error) {
    console.error("sendNotification error:", error);
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
