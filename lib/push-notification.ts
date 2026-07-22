/**
 * Push notification delivery — Firebase-only.
 *
 * Delivers push notifications via Firebase Cloud Messaging (FCM).
 * Supports two subscription types:
 *   1. Direct FCM token (fcmToken field)
 *   2. Web Push endpoint pointing to FCM (extract token from URL)
 *
 * Uses Node.js built-in `https` module to call Google's REST APIs,
 * bypassing the Firebase Admin SDK's HTTP stack entirely.
 */

import { connectToDatabase } from "./mongodb";
import { PushSubscription } from "./models/PushSubscription";
import { Notification } from "./models/Notification";

/** FCM base URL for Web Push subscriptions on Chrome/Android */
const FCM_PUSH_ENDPOINT = "https://fcm.googleapis.com/fcm/send/";

/**
 * Extract the FCM registration token from a Web Push subscription endpoint.
 * Chrome on Android uses FCM as its push service, so the endpoint URL
 * contains the FCM token after the '/fcm/send/' path.
 *
 * Example: https://fcm.googleapis.com/fcm/send/eOjRqEyGk00:APA91bH0m1Vl...
 * Extracts: eOjRqEyGk00:APA91bH0m1Vl...
 */
function extractFcmTokenFromEndpoint(endpoint: string): string | null {
  if (!endpoint.startsWith(FCM_PUSH_ENDPOINT)) return null;
  const token = endpoint.slice(FCM_PUSH_ENDPOINT.length);
  return token || null;
}

/**
 * Send a push notification to a specific user via Firebase FCM.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; message: string; url?: string; tag?: string }
): Promise<{ success: number; failed: number }> {
  try {
    await connectToDatabase();

    const subscriptions = await PushSubscription.find({ userId }).lean();

    console.log("[PUSH-DEBUG] sendPushToUser(" + userId + ")");
    console.log("[PUSH-DEBUG] Subscriptions found:", subscriptions.length);

    if (subscriptions.length === 0) {
      console.warn("[PUSH-DEBUG] ⚠️ No subscriptions found for user", userId);
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        // ── Route 1: Direct FCM token ──
        if ("fcmToken" in sub && (sub as any).fcmToken) {
          const fcmToken = (sub as any).fcmToken as string;
          console.log(`[PUSH-DEBUG] Route 1: Direct FCM token: ${fcmToken.slice(0, 20)}...`);

          const outcome = await deliverViaFirebase(fcmToken, payload.title, payload.message, payload.url, sub._id.toString());
          if (outcome === "sent") success++;
          else failed++;
          continue;
        }

        // ── Route 2: Web Push subscription with FCM endpoint ──
        const fcmToken = extractFcmTokenFromEndpoint(sub.endpoint || "");
        if (fcmToken) {
          console.log(`[PUSH-DEBUG] Route 2: FCM endpoint → token: ${fcmToken.slice(0, 30)}...`);

          const outcome = await deliverViaFirebase(fcmToken, payload.title, payload.message, payload.url, sub._id.toString());
          if (outcome === "sent") success++;
          else failed++;
          continue;
        }

        // ── Unknown subscription type (no token, no FCM endpoint) ──
        console.warn(`[PUSH-DEBUG] ⚠️ Unknown subscription type, skipping`);
        failed++;
      } catch (err: unknown) {
        console.error("[PUSH-DEBUG] ❌ Push send error:", err);
        failed++;
      }
    }

    console.log(`[PUSH-DEBUG] 📬 Result: ${success} sent, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error("[PUSH-DEBUG] Send push error:", error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Deliver a push notification via Firebase FCM REST API.
 * Uses Node.js built-in `https` module (not Firebase Admin SDK).
 *
 * Automatically deletes the subscription if the token is expired.
 */
async function deliverViaFirebase(
  fcmToken: string,
  title: string,
  message: string,
  url: string | undefined,
  subId: string
): Promise<"sent" | "failed"> {
  const { sendFcmNotification } = await import("./firebase-admin");
  const result = await sendFcmNotification(fcmToken, title, message, url);

  switch (result) {
    case "sent":
      console.log("[PUSH-DEBUG] ✅ Firebase deliver success");
      return "sent";
    case "token-expired":
      console.warn("[PUSH-DEBUG] ⚠️ Token expired — deleting subscription");
      await PushSubscription.findByIdAndDelete(subId).catch(() => {});
      return "failed";
    default:
      return "failed";
  }
}
