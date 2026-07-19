import webpush from "web-push";
import { connectToDatabase } from "./mongodb";
import { PushSubscription } from "./models/PushSubscription";
import { Setting } from "./models/Setting";

const VAPID_PUBLIC_KEY_SETTING = "vapid_public_key";
const VAPID_PRIVATE_KEY_SETTING = "vapid_private_key";
const VAPID_SUBJECT = "mailto:admin@prospectmanager.app";

/**
 * Get or generate VAPID keys.
 * In production, reads from env vars first, then falls back to DB-stored keys.
 * Keys are auto-generated on first use and stored in the database.
 */
export async function getVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  // First check env vars (production override)
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  // Check DB for stored keys
  await connectToDatabase();

  let pubSetting = await Setting.findOne({ key: VAPID_PUBLIC_KEY_SETTING });
  let privSetting = await Setting.findOne({ key: VAPID_PRIVATE_KEY_SETTING });

  if (pubSetting && privSetting) {
    return {
      publicKey: pubSetting.value,
      privateKey: privSetting.value,
    };
  }

  // Generate new keys and store in DB
  const vapidKeys = webpush.generateVAPIDKeys();

  await Setting.findOneAndUpdate(
    { key: VAPID_PUBLIC_KEY_SETTING },
    { value: vapidKeys.publicKey },
    { upsert: true }
  );
  await Setting.findOneAndUpdate(
    { key: VAPID_PRIVATE_KEY_SETTING },
    { value: vapidKeys.privateKey },
    { upsert: true }
  );

  console.log("🔑 Generated new VAPID keys and stored in database.");
  console.log(`   Public key: ${vapidKeys.publicKey}`);
  console.log("   Add this to your .env as VAPID_PUBLIC_KEY for production.");

  return vapidKeys;
}

/**
 * Initialize web-push with VAPID keys (call once at startup)
 */
let initialized = false;

export async function initWebPush(): Promise<string> {
  if (initialized) return "";

  const keys = await getVapidKeys();
  webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
  initialized = true;
  return keys.publicKey;
}

/**
 * Send a push notification to a specific user.
 * Returns { success, failed } counts.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; message: string; url?: string; tag?: string }
): Promise<{ success: number; failed: number }> {
  try {
    await connectToDatabase();
    await initWebPush();

    const subscriptions = await PushSubscription.find({ userId }).lean();

    if (subscriptions.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    const payloadStr = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || "/",
      tag: payload.tag || "default",
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payloadStr
        );
        success++;
      } catch (err: unknown) {
        // Check if subscription is expired/invalid - remove it
        if (err && typeof err === "object" && "statusCode" in err) {
          const statusCode = (err as { statusCode: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await PushSubscription.findByIdAndDelete(sub._id);
          }
        }
        failed++;
      }
    }

    return { success, failed };
  } catch (error) {
    console.error("Send push error:", error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Get the VAPID public key for client-side subscription
 */
export async function getPublicKey(): Promise<string> {
  const keys = await getVapidKeys();
  return keys.publicKey;
}
