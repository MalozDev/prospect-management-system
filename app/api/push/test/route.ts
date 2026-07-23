import { NextRequest } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { sendNotification, notifyAllSuperadmins } from "@/lib/send-notification";

/**
 * 🔧 TEST / DEBUG endpoint for push notifications.
 *
 * POST /api/push/test
 * Body: { title?: string, message?: string, url?: string }
 *
 * Triggers a test notification to the currently authenticated user.
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const title = body.title || "🔔 Test Push Notification";
  const message = body.message || "If you can read this, push notifications are working! 🎉";
  const url = body.url || "/";

  console.log("\n===========================================");
  console.log("[TEST-PUSH] ====== TEST PUSH TRIGGERED ======");
  console.log("[TEST-PUSH] User ID:", user.userId);
  console.log("[TEST-PUSH] User name:", user.name);
  console.log("[TEST-PUSH] Title:", title);
  console.log("[TEST-PUSH] Message:", message);
  console.log("[TEST-PUSH] URL:", url);
  console.log("===========================================\n");

  try {
    // Send to the requesting user
    await sendNotification({
      title,
      message,
      userId: user.userId,
      url,
      tag: "test-push",
    });

    // Also send to all superadmins (covers the phone user "Stephan Malobeka")
    notifyAllSuperadmins({
      title: `${title} (superadmin)`,
      message,
      url,
      tag: "test-push-superadmin",
    }).catch(() => {});

    return Response.json({
      success: true,
      message: "Test notification sent. Check server console for [PUSH] logs.",
    });
  } catch (error) {
    console.error("[TEST-PUSH] Error:", error);
    return Response.json(
      { success: false, error: "Failed to send test notification." },
      { status: 500 }
    );
  }
}
