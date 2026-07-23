import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PushSubscription } from "@/lib/models/PushSubscription";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

/**
 * POST /api/push/subscribe
 *
 * Registers a standard Web Push subscription for the authenticated user.
 * Accepts the push subscription object (endpoint + keys) that was created
 * via `PushManager.subscribe()` on the client.
 *
 * Body:
 *   { subscription: { endpoint: string, keys: { p256dh: string, auth: string } }, userAgent?: string }
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return Response.json(
        { error: "Invalid subscription object. Requires endpoint and keys (p256dh, auth)." },
        { status: 400 }
      );
    }

    // Remove any existing subscription with the same endpoint (re-registration)
    await PushSubscription.findOneAndDelete({ endpoint: subscription.endpoint });

    // Save the new subscription
    await PushSubscription.create({
      userId: user.userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: userAgent || "",
    });

    console.log("[PUSH] ✅ Subscription saved for user", user.userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("[PUSH] Subscribe error:", error);
    return Response.json({ error: "Failed to subscribe." }, { status: 500 });
  }
}
