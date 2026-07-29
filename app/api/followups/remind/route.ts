import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FollowUp } from "@/lib/models/FollowUp";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { sendNotification } from "@/lib/send-notification";
import { defer } from "@/lib/defer";

/**
 * POST /api/followups/remind
 *
 * Sends a manual reminder notification (in-app + push) to the DSE
 * assigned to a specific follow-up. Called when the superadmin clicks
 * the "Send Reminder" button on a followup in the developer console.
 *
 * Body: { followUpId: string }
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== "SUPERADMIN") {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const { followUpId } = await request.json();

    if (!followUpId) {
      return Response.json({ error: "followUpId is required." }, { status: 400 });
    }

    // Find the followup
    const followUp = await FollowUp.findById(followUpId).lean();
    if (!followUp) {
      return Response.json({ error: "Follow-up not found." }, { status: 404 });
    }

    // Find the DSE user assigned to this followup
    const dseUser = await User.findOne({ name: followUp.assignedDse, role: "DSE" }).lean();
    if (!dseUser) {
      return Response.json({ error: `DSE '${followUp.assignedDse}' not found.` }, { status: 404 });
    }

    const dseUserId = String(dseUser._id);
    const dseName = followUp.assignedDse;
    const prospectName = followUp.customerName;
    const status = followUp.status;
    const dueDate = followUp.expectedPurchaseDate;

    // Build the reminder message
    const title = `⏰ Follow-up Reminder: ${prospectName}`;
    const message = `You have a ${status} follow-up with ${prospectName} (Due: ${dueDate}). Kindly check your app and follow up now!`;

    console.log(`[REMINDER] Superadmin ${user.name} sent reminder to DSE ${dseName} for prospect ${prospectName}`);
    console.log(`[REMINDER] Message: "${message}"`);

    // Send notification via existing infrastructure (in-app + push)
    defer(async () => {
      await sendNotification({
        title,
        message,
        userId: dseUserId,
        url: "/followups",
        tag: "followup-reminder",
      });
    }, request.signal);

    return Response.json({
      ok: true,
      message: `Reminder sent to ${dseName} about ${prospectName}`,
      dseName,
      prospectName,
    });
  } catch (error) {
    console.error("[REMINDER] Error sending reminder:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
