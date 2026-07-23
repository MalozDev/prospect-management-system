import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PushSubscription } from "@/lib/models/PushSubscription";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

/**
 * POST /api/push/unsubscribe
 *
 * Removes a push subscription for the authenticated user.
 *
 * Body: { endpoint?: string }
 * If endpoint is provided, only that subscription is removed.
 * If omitted, all subscriptions for the user are removed.
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const { endpoint } = await request.json();

    if (endpoint) {
      // Remove specific subscription
      await PushSubscription.findOneAndDelete({ endpoint, userId: user.userId });
    } else {
      // Remove all subscriptions for this user
      await PushSubscription.deleteMany({ userId: user.userId });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe push error:", error);
    return Response.json({ error: "Failed to unsubscribe." }, { status: 500 });
  }
}
