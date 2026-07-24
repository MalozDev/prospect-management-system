/**
 * Follow-up reminder: sends recurring push notifications every 15 minutes
 * to DSE users for follow-ups that are due/overdue and haven't been contacted.
 *
 * Stops automatically when the follow-up is marked as contacted
 * (lastContacted is set).
 */

import { connectToDatabase } from "./mongodb";
import { FollowUp } from "./models/FollowUp";
import { Notification } from "./models/Notification";
import { User } from "./models/User";
import { sendPushToUser } from "./push-notification";
import { getNowLocalISO } from "./time-utils";

const REMINDER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Find all uncontacted follow-ups that are due TODAY or OVERDUE,
 * grouped by the assigned DSE, and create in-app + push notifications
 * for each DSE summarizing their pending follow-ups.
 *
 * Skips follow-ups that were reminded less than 15 minutes ago.
 */
export async function sendFollowUpReminders(): Promise<void> {
  try {
    await connectToDatabase();

    const now = getNowLocalISO();

    // Find follow-ups that:
    // - Are due TODAY or OVERDUE
    // - Haven't been contacted (no lastContacted)
    // - Haven't been resolved (not SOLD or LOST)
    // - Haven't been reminded in the last 15 minutes (or never reminded)
    const cutoff = new Date(Date.now() - REMINDER_INTERVAL_MS).toISOString();

    const pendingFollowUps = await FollowUp.find({
      status: { $in: ["TODAY", "OVERDUE"] },
      lastContacted: { $in: ["", null] },
      outcome: { $nin: ["SOLD", "LOST"] },
      $or: [
        { lastRemindedAt: "" },
        { lastRemindedAt: { $lt: cutoff } },
        { lastRemindedAt: null },
        { lastRemindedAt: undefined },
      ],
    }).lean();

    if (pendingFollowUps.length === 0) {
      console.log("[REMINDER] No pending follow-ups to remind about.");
      return;
    }

    // Group by assigned DSE
    const dseGroups = new Map<string, typeof pendingFollowUps>();
    const reminderIds: string[] = [];

    for (const fu of pendingFollowUps) {
      const dse = fu.assignedDse;
      if (!dse) continue;
      const group = dseGroups.get(dse) || [];
      group.push(fu);
      dseGroups.set(dse, group);
      reminderIds.push(String(fu._id));
    }

    console.log(
      `[REMINDER] Sending reminders for ${pendingFollowUps.length} follow-ups to ${dseGroups.size} DSE(s)…`
    );

    // Send in-app + push notifications per DSE summarizing their pending follow-ups
    for (const [dseName, followUps] of dseGroups.entries()) {
      const count = followUps.length;
      const namesList = followUps
        .slice(0, 3)
        .map((f) => f.customerName)
        .join(", ");
      const more = count > 3 ? ` and ${count - 3} more` : "";

      const title = `Follow-up Reminder`;
      const message = `You have ${count} follow-up${count > 1 ? "s" : ""} pending: ${namesList}${more}. Please contact ${count > 1 ? "them" : "the prospect"} now.`;

      // Find the DSE user's ID
      const dseUser = await User.findOne({ name: dseName, role: "DSE" })
        .select("_id")
        .lean();

      if (dseUser) {
        const userId = String(dseUser._id);

        // Create in-app notification (so it shows in the app)
        await Notification.create({
          title,
          message,
          time: now,
          unread: true,
          userId,
          url: "/followups",
        });

        // Send push notification (so it pops up on the device)
        await sendPushToUser(userId, {
          title,
          message,
          url: "/followups",
          tag: "followup-reminder",
        });
      } else {
        console.warn(`[REMINDER] ⚠️ DSE user "${dseName}" not found — skipping reminder.`);
      }
    }

    // Update lastRemindedAt for all reminded follow-ups
    if (reminderIds.length > 0) {
      await FollowUp.updateMany(
        { _id: { $in: reminderIds } },
        { $set: { lastRemindedAt: now } }
      );
    }

    console.log(`[REMINDER] ✅ Updated lastRemindedAt for ${reminderIds.length} follow-ups.`);
  } catch (error) {
    console.error("[REMINDER] Error sending follow-up reminders:", error);
  }
}

/**
 * Start the recurring reminder scheduler.
 * Runs every 15 minutes (first run after 1 minute delay).
 */
export function startReminderScheduler(): void {
  // First run after 1 minute (gives the server time to initialize)
  setTimeout(() => {
    sendFollowUpReminders().catch(() => {});
  }, 60_000);

  // Then every 15 minutes
  setInterval(() => {
    sendFollowUpReminders().catch(() => {});
  }, REMINDER_INTERVAL_MS);

  console.log("[REMINDER] ⏰ Scheduler started — will check every 15 minutes.");
}
