/**
 * Push notification delivery — Web Push API (standard, cross-browser).
 *
 * Uses the `web-push` library to deliver notifications via the W3C Web Push
 * Protocol. Works on all modern browsers that support push notifications:
 *   - Chrome (Android, Desktop)
 *   - Firefox (Android, Desktop)
 *   - Safari 16.4+ (iOS, macOS)
 *   - Edge
 *   - Samsung Internet
 *
 * VAPID keys are required. Generate with:
 *   npx web-push generate-vapid-keys
 */

import webpush from "web-push";
import { connectToDatabase } from "./mongodb";
import { PushSubscription } from "./models/PushSubscription";

/** Cache for VAPID config so we only read env vars once */
let vapidConfigured = false;

function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.warn(
      "[PUSH] VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars."
    );
    return false;
  }

  webpush.setVapidDetails(
    "mailto:prospects@airtel.co.zm",
    publicKey,
    privateKey
  );

  vapidConfigured = true;
  console.log("[PUSH] ✅ VAPID configured for Web Push");
  return true;
}

/**
 * Send a push notification to a specific user via Web Push API.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; message: string; url?: string; tag?: string; unreadCount?: number }
): Promise<{ success: number; failed: number }> {
  try {
    if (!ensureVapidConfig()) return { success: 0, failed: 0 };

    await connectToDatabase();

    const subscriptions = await PushSubscription.find({ userId }).lean();

    console.log("[PUSH] sendPushToUser(" + userId + ") — subscriptions:", subscriptions.length);

    if (subscriptions.length === 0) {
      console.warn("[PUSH] ⚠️ No subscriptions found for user", userId);
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || "/",
      tag: payload.tag || "default",
      unreadCount: payload.unreadCount,
    });

    for (const sub of subscriptions) {
      try {
        // Skip invalid/old subscriptions (e.g. leftover FCM-only records)
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
          console.warn("[PUSH] ⚠️ Invalid subscription — deleting");
          await PushSubscription.findByIdAndDelete(sub._id).catch(() => {});
          failed++;
          continue;
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };

        console.log("[PUSH] 📤 Sending to endpoint:", sub.endpoint?.slice(0, 70) + "...");
        console.log("[PUSH] 📤 p256dh:", sub.keys?.p256dh?.slice(0, 30) + "...");
        console.log("[PUSH] 📤 auth:", sub.keys?.auth?.slice(0, 15) + "...");

        await webpush.sendNotification(pushSubscription, notificationPayload, {
          TTL: 86400, // 24 hours — deliver when device comes online
        });

        success++;
      } catch (err: unknown) {
        // Detect expired/invalid subscriptions — delete them
        if (err instanceof webpush.WebPushError) {
          if (
            err.statusCode === 410 || // Gone — subscription expired
            err.statusCode === 404 || // Not found
            err.statusCode === 403     // Invalid
          ) {
            console.warn(`[PUSH] ⚠️ Subscription expired (HTTP ${err.statusCode}) — deleting`);
            if (err.statusCode === 403 || err.statusCode === 410) {
              console.error(`[PUSH] 🔍 ${err.statusCode} body:`, (err as any).body || err.message);
              console.error(`[PUSH] 🔍 ${err.statusCode} headers:`, JSON.stringify((err as any).headers || {}));
            }
            await PushSubscription.findByIdAndDelete(sub._id).catch(() => {});
          } else {
            console.error(`[PUSH] ❌ WebPush error (HTTP ${err.statusCode}):`, err.message);
          }
        } else {
          console.error("[PUSH] ❌ Unexpected error:", err);
          if (err instanceof AggregateError && Array.isArray((err as any).errors)) {
            for (const e of (err as any).errors) {
              console.error("[PUSH]   → Sub-error:", e.message || e);
              if (e.statusCode) console.error("[PUSH]     statusCode:", e.statusCode);
              if (e.body) console.error("[PUSH]     body:", e.body);
            }
          }
        }
        failed++;
      }
    }

    console.log(`[PUSH] 📬 Result: ${success} sent, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error("[PUSH] sendPushToUser error:", error);
    return { success: 0, failed: 0 };
  }
}
