import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/lib/models/Notification";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

/**
 * DELETE /api/notifications/clear
 *
 * Deletes ALL notifications belonging to the authenticated user.
 * Used by the "Clear all" button in notification pages.
 */
export async function DELETE(_request: NextRequest) {
  const user = getUserFromRequest(_request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const result = await Notification.deleteMany({ userId: user.userId });

    return Response.json({
      message: "All notifications cleared.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear notifications error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
