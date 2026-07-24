import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FollowUp } from "@/lib/models/FollowUp";
import { getTodayLocal, getNowLocalISO } from "@/lib/time-utils";
import { Prospect } from "@/lib/models/Prospect";
import { Sale } from "@/lib/models/Sale";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { Notification } from "@/lib/models/Notification";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { getSupervisorUserId, sendNotification, notifyAllSuperadmins } from "@/lib/send-notification";
import { defer } from "@/lib/defer";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const today = getTodayLocal();

    // === MARK AS CONTACTED ===
    if (body.action === "contacted") {
      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        { $set: { status: "COMPLETED", outcome: "PENDING_REVIEW", lastContacted: today } },
        { new: true }
      ).lean();

      if (!followUp) return Response.json({ error: "Follow-up not found." }, { status: 404 });

      // ═══ SYNC: update prospect status (data consistency) ═══
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, {
          $set: { status: "CONTACTED", lastContacted: getNowLocalISO() },
        });
      }

      const response = Response.json({ followUp });

      // ═══ DEFERRED: activity log only ═══
      defer(async () => {
        await Activity.create({
          title: "Follow up completed",
          detail: `Follow up completed for ${followUp.customerName}`,
          time: getNowLocalISO(),
          type: "followup",
          userId: user.userId,
          dseName: user.name,
        });
      }, request.signal);

      return response;
    }

    // === SOLD ===
    if (body.action === "sold") {
      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        { $set: { outcome: "SOLD", status: "COMPLETED", lastContacted: today } },
        { new: true }
      ).lean();

      if (!followUp) return Response.json({ error: "Follow-up not found." }, { status: 404 });

      // ═══ SYNC: create sale + update prospect (data consistency) ═══
      const sale = await Sale.create({
        customer: followUp.customerName,
        packageName: body.packageName || "ODU",
        amount: body.amount || 200,
        soldBy: user.name,
        date: today,
      });

      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, { $set: { status: "SOLD" } });
      }

      // ═══ RESPOND IMMEDIATELY ═══
      const response = Response.json({ followUp, sale });

      // ═══ DEFERRED: activity + notification + supervisor/admin alerts ═══
      defer(async () => {
        await Activity.create({
          title: "Sale completed",
          detail: `ODU sale closed for ${followUp.customerName}`,
          time: getNowLocalISO(),
          type: "sale",
          userId: user.userId,
          dseName: user.name,
        });

        await Notification.create({
          title: "Sale Completed",
          message: `Sale completed for ${followUp.customerName}`,
          time: getNowLocalISO(),
          unread: true,
          userId: user.userId,
        });

        if (user.role === "DSE") {
          const supervisorUserId = await getSupervisorUserId(user.name);
          if (supervisorUserId) {
            const dseUser = await User.findOne({ name: user.name }).select('supervisor').lean();
            const supervisorName = dseUser?.supervisor || 'N/A';
            await sendNotification({
              title: "Sale Closed",
              message: `${sale.customer} — DSE: ${user.name} — Supervisor: ${supervisorName}`,
              userId: supervisorUserId,
              url: "/supervisor/sales",
              tag: "sale",
            });
          }
        }

        // Look up supervisor name for superadmin notification
        const dseInfo = await User.findOne({ name: user.name }).select('supervisor').lean();
        const globalSupervisorName = dseInfo?.supervisor || 'N/A';
        await notifyAllSuperadmins({
          title: "Sale Closed",
          message: `${sale.customer} — DSE: ${user.name} — Supervisor: ${globalSupervisorName}`,
          url: "/developer/dashboard",
          tag: "sale",
        });
      }, request.signal);

      return response;
    }

    // === LOST ===
    if (body.action === "lost") {
      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        { $set: { outcome: "LOST", status: "COMPLETED", lastContacted: today } },
        { new: true }
      ).lean();

      if (!followUp) return Response.json({ error: "Follow-up not found." }, { status: 404 });

      // ═══ SYNC: update prospect status ═══
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, { $set: { status: "LOST" } });
      }

      const response = Response.json({ followUp });

      // ═══ DEFERRED: activity log only ═══
      defer(async () => {
        await Activity.create({
          title: "Prospect lost",
          detail: `${followUp.customerName} marked as lost`,
          time: getNowLocalISO(),
          type: "lost",
          userId: user.userId,
          dseName: user.name,
        });
      }, request.signal);

      return response;
    }

    // === SCHEDULE VISIT ===
    if (body.action === "schedule_visit") {
      const visitDate = body.visitDate || "";

      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        { $set: { outcome: "VISIT_SCHEDULED", status: "COMPLETED", lastContacted: today, visitDate } },
        { new: true }
      ).lean();

      if (!followUp) return Response.json({ error: "Follow-up not found." }, { status: 404 });

      // ═══ SYNC: update prospect + create visit followup ═══
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, { $set: { status: "VISIT SCHEDULED" } });
      }

      const visitComputedStatus = visitDate === today ? "TODAY" : "UPCOMING";
      await FollowUp.create({
        customerName: followUp.customerName,
        phone: followUp.phone,
        expectedPurchaseDate: visitDate,
        status: visitComputedStatus,
        category: "VISIT",
        isFirstFollowUp: false,
        lastContacted: today,
        assignedDse: user.name,
        prospectId: followUp.prospectId,
        visitDate,
        notes: body.notes || "",
      });

      const response = Response.json({ followUp });

      defer(async () => {
        await Notification.create({
          title: "Visit Scheduled",
          message: `Visit scheduled for ${followUp.customerName} on ${visitDate || "soon"}`,
          time: getNowLocalISO(),
          unread: true,
          userId: user.userId,
        });

        await Activity.create({
          title: "Visit scheduled",
          detail: `Visit scheduled for ${followUp.customerName} on ${visitDate || "soon"}`,
          time: getNowLocalISO(),
          type: "visit",
          userId: user.userId,
          dseName: user.name,
        });
      }, request.signal);

      return response;
    }

    // === POSTPONE ===
    if (body.action === "postpone") {
      const newDate = body.newDate || "";

      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        { $set: { outcome: "POSTPONED", status: "COMPLETED", lastContacted: today } },
        { new: true }
      ).lean();

      if (!followUp) return Response.json({ error: "Follow-up not found." }, { status: 404 });

      // ═══ SYNC: update prospect + create postponed followup ═══
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, { $set: { status: "POSTPONED" } });
      }

      const newComputedStatus = newDate === today ? "TODAY" : newDate < today ? "OVERDUE" : "UPCOMING";
      await FollowUp.create({
        customerName: followUp.customerName,
        phone: followUp.phone,
        expectedPurchaseDate: newDate,
        status: newComputedStatus,
        category: followUp.category,
        isFirstFollowUp: false,
        lastContacted: today,
        assignedDse: user.name,
        prospectId: followUp.prospectId,
        notes: body.notes || `Postponed from ${followUp.expectedPurchaseDate}`,
      });

      const response = Response.json({ followUp });

      defer(async () => {
        await Activity.create({
          title: "Follow-up postponed",
          detail: `${followUp.customerName} postponed to ${newDate}`,
          time: getNowLocalISO(),
          type: "followup",
          userId: user.userId,
          dseName: user.name,
        });
      }, request.signal);

      return response;
    }

    // === Fallback: update specific fields ===
    const allowedFields = ["status", "category", "lastContacted", "isFirstFollowUp", "outcome", "notes"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields or action to update." }, { status: 400 });
    }

    const followUp = await FollowUp.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!followUp) return Response.json({ error: "Follow-up not found." }, { status: 404 });

    return Response.json({ followUp });
  } catch (error) {
    console.error("Update follow-up error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
