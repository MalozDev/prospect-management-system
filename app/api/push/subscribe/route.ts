import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PushSubscription } from "@/lib/models/PushSubscription";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

/**
 * POST /api/push/subscribe
 *
 * Registers an FCM push subscription for the authenticated user.
 * Only accepts Firebase Cloud Messaging (FCM) tokens — the old
 * Web Push endpoint/keys method has been removed.
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await request.json();
    const { fcmToken, userAgent } = body;

    if (!fcmToken) {
      return Response.json(
        { error: "fcmToken is required." },
        { status: 400 }
      );
    }

    // Remove any existing subscription with same FCM token
    await PushSubscription.findOneAndDelete({ fcmToken });

    // Save new subscription
    await PushSubscription.create({
      userId: user.userId,
      endpoint: "",
      fcmToken,
      userAgent: userAgent || "",
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Subscribe push error:", error);
    return Response.json({ error: "Failed to subscribe." }, { status: 500 });
  }
}
