/**
 * POST /api/followups/reminders
 *
 * Trigger follow-up reminders manually. Can be called by:
 *   1. The internal scheduler (instrumentation.ts) every 15 minutes
 *   2. An external cron job (cron-job.org, etc.) via HTTP POST
 *   3. A superadmin manually from the dashboard
 *
 * This endpoint is PROTECTED — only authenticated superadmin users
 * can trigger reminders to prevent abuse.
 *
 * Usage (external cron):
 *   curl -X POST https://yourdomain.com/api/followups/reminders \
 *     -H "Authorization: Bearer <superadmin-token>"
 *
 * For internal use (setInterval in instrumentation.ts), the endpoint
 * can also accept a special internal key for authentication:
 *   curl -X POST https://yourdomain.com/api/followups/reminders \
 *     -H "x-cron-secret: <CRON_SECRET>"
 */

import { NextRequest } from "next/server";
import { sendFollowUpReminders } from "@/lib/followup-reminder";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Allow internal cron via secret header (no JWT needed)
  const cronSecret = request.headers.get("x-cron-secret");
  const internalSecret = process.env.CRON_SECRET || "internal-followup-reminder-secret";

  if (cronSecret === internalSecret) {
    // Internal cron — trigger reminders
    await sendFollowUpReminders();
    return Response.json({ success: true, message: "Follow-up reminders sent." });
  }

  // Otherwise, require superadmin JWT authentication
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (user.role !== "SUPERADMIN") {
    return Response.json({ error: "Only superadmins can trigger reminders." }, { status: 403 });
  }

  await sendFollowUpReminders();

  return Response.json({ success: true, message: "Follow-up reminders sent." });
}

/**
 * GET handler — simple health check to verify the endpoint is reachable.
 */
export async function GET() {
  return Response.json({
    status: "ready",
    description: "POST to this endpoint to send follow-up reminders to DSE users.",
  });
}
