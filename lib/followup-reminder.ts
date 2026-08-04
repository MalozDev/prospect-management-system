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
import { getNowLocalISO, getTodayLocal } from "./time-utils";

const REMINDER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const VISIT_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

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
 * Send a push notification to the DSE the moment a same-day scheduled
 * visit's time arrives (e.g. visit scheduled for today at 14:30 fires
 * at 14:30).
 *
 * Runs on a fast (1-minute) tick so the notification lands right when
 * the visit time is reached. Each visit is reminded only once — tracked
 * via `visitRemindedAt`.
 */
export async function sendVisitTimeReminders(): Promise<void> {
  try {
    await connectToDatabase();

    const now = getNowLocalISO();
    const today = getTodayLocal();
    const nowMs = Date.now();

    // Same-day VISIT follow-ups with a scheduled time that haven't been
    // completed/resolved yet.
    // NOTE: we intentionally do NOT filter on `lastContacted` — the
    // schedule_visit flow creates the VISIT follow-up with lastContacted
    // already set (the DSE just spoke to the customer), so filtering on it
    // would prevent the reminder from ever firing. Completed visits are
    // excluded via `status: "TODAY"` (visiting sets status to COMPLETED).
    const visitFollowUps = await FollowUp.find({
      category: "VISIT",
      status: "TODAY",
      visitDate: today,
      visitTime: { $ne: "" },
      outcome: { $nin: ["SOLD", "LOST"] },
    }).lean();

    const dueVisits: typeof visitFollowUps = [];
    const remindedIds: string[] = [];

    for (const fu of visitFollowUps) {
      const [h, m] = fu.visitTime.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;

      // Visit datetime in LOCAL time: today's date + the picked time
      const visitDateObj = new Date(`${fu.visitDate}T00:00:00`);
      visitDateObj.setHours(h, m, 0, 0);
      const visitMs = visitDateObj.getTime();

      // Only fire once the visit time has arrived
      if (nowMs < visitMs) continue;

      // Skip if already reminded at/after the visit time
      const remindedAt = fu.visitRemindedAt ? new Date(fu.visitRemindedAt).getTime() : 0;
      if (remindedAt >= visitMs) continue;

      dueVisits.push(fu);
      remindedIds.push(String(fu._id));
    }

    if (dueVisits.length === 0) return;

    for (const fu of dueVisits) {
      const dseUser = await User.findOne({ name: fu.assignedDse, role: "DSE" })
        .select("_id")
        .lean();

      if (!dseUser) {
        console.warn(`[VISIT-REMINDER] ⚠️ DSE user "${fu.assignedDse}" not found — skipping visit reminder.`);
        continue;
      }

      const userId = String(dseUser._id);
      const title = "Visit Time";
      const message = `Your visit with ${fu.customerName} is due now at ${fu.visitTime}.`;

      await Notification.create({
        title,
        message,
        time: now,
        unread: true,
        userId,
        url: "/followups",
      });

      await sendPushToUser(userId, {
        title,
        message,
        url: "/followups",
        tag: "visit-time",
      });

      console.log(`[VISIT-REMINDER] 🔔 Visit reminder sent to ${fu.assignedDse} for ${fu.customerName} at ${fu.visitTime}.`);
    }

    if (remindedIds.length > 0) {
      await FollowUp.updateMany(
        { _id: { $in: remindedIds } },
        { $set: { visitRemindedAt: now } }
      );
    }
  } catch (error) {
    console.error("[VISIT-REMINDER] Error sending visit-time reminders:", error);
  }
}

/**
 * Start the recurring reminder scheduler.
 * - Follow-up reminders: every 15 minutes (first run after 1 minute).
 * - Visit-time reminders: every 1 minute so they fire right when the
 *   scheduled visit time arrives (first run after 30 seconds).
 */
export function startReminderScheduler(): void {
  // Follow-up reminders — first run after 1 minute, then every 15 minutes
  setTimeout(() => {
    sendFollowUpReminders().catch(() => {});
  }, 60_000);
  setInterval(() => {
    sendFollowUpReminders().catch(() => {});
  }, REMINDER_INTERVAL_MS);

  // Visit-time reminders — first run after 30 seconds, then every minute
  setTimeout(() => {
    sendVisitTimeReminders().catch(() => {});
  }, 30_000);
  setInterval(() => {
    sendVisitTimeReminders().catch(() => {});
  }, VISIT_CHECK_INTERVAL_MS);

  console.log("[REMINDER] ⏰ Scheduler started — follow-ups every 15 min, visit times every minute.");
}
