import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PushSubscription } from "@/lib/models/PushSubscription";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const { endpoint, keys, userAgent } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return Response.json({ error: "Invalid subscription object." }, { status: 400 });
    }

    // Remove old subscription with same endpoint if exists
    await PushSubscription.findOneAndDelete({ endpoint });

    // Save new subscription
    await PushSubscription.create({
      userId: user.userId,
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      userAgent: userAgent || "",
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Subscribe push error:", error);
    return Response.json({ error: "Failed to subscribe." }, { status: 500 });
  }
}
