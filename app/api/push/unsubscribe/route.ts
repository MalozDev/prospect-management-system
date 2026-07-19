import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PushSubscription } from "@/lib/models/PushSubscription";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

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
