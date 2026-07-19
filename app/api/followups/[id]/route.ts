import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FollowUp } from "@/lib/models/FollowUp";
import { Prospect } from "@/lib/models/Prospect";
import { Sale } from "@/lib/models/Sale";
import { Activity } from "@/lib/models/Activity";
import { Notification } from "@/lib/models/Notification";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

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

    const today = new Date().toISOString().slice(0, 10);

    // === MARK AS CONTACTED ===
    if (body.action === "contacted") {
      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        {
          $set: {
            status: "COMPLETED",
            outcome: "PENDING_REVIEW",
            lastContacted: today,
          },
        },
        { new: true }
      ).lean();

      if (!followUp) {
        return Response.json({ error: "Follow-up not found." }, { status: 404 });
      }

      // Update linked prospect status to CONTACTED and store contacted timestamp
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, {
          $set: { status: "CONTACTED", lastContacted: new Date().toISOString() },
        });
      }

      // Log activity
      await Activity.create({
        title: "Follow up completed",
        detail: `Follow up completed for ${followUp.customerName}`,
        time: new Date().toISOString(),
        type: "followup",
        userId: user.userId,
      });

      return Response.json({ followUp });
    }

    // === SOLD ===
    if (body.action === "sold") {
      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        { $set: { outcome: "SOLD" } },
        { new: true }
      ).lean();

      if (!followUp) {
        return Response.json({ error: "Follow-up not found." }, { status: 404 });
      }

      // Create sale record
      const sale = await Sale.create({
        customer: followUp.customerName,
        packageName: body.packageName || "ODU",
        amount: body.amount || 200,
        soldBy: user.name,
        date: today,
      });

      // Update linked prospect if exists
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, {
          $set: { status: "SOLD" },
        });
      }

      // Log activity
      await Activity.create({
        title: "Sale completed",
        detail: `ODU sale closed for ${followUp.customerName}`,
        time: new Date().toISOString(),
        type: "sale",
        userId: user.userId,
      });

      // Create notification
      await Notification.create({
        title: "Sale Completed",
        message: `Sale completed for ${followUp.customerName}`,
        time: new Date().toISOString(),
        unread: true,
        userId: user.userId,
      });

      return Response.json({ followUp, sale });
    }

    // === LOST ===
    if (body.action === "lost") {
      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        { $set: { outcome: "LOST" } },
        { new: true }
      ).lean();

      if (!followUp) {
        return Response.json({ error: "Follow-up not found." }, { status: 404 });
      }

      // Update linked prospect if exists
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, {
          $set: { status: "LOST" },
        });
      }

      // Log activity
      await Activity.create({
        title: "Prospect lost",
        detail: `${followUp.customerName} marked as lost`,
        time: new Date().toISOString(),
        type: "lost",
        userId: user.userId,
      });

      return Response.json({ followUp });
    }

    // === SCHEDULE VISIT ===
    if (body.action === "schedule_visit") {
      const visitDate = body.visitDate || "";

      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        {
          $set: {
            outcome: "VISIT_SCHEDULED",
            visitDate,
          },
        },
        { new: true }
      ).lean();

      if (!followUp) {
        return Response.json({ error: "Follow-up not found." }, { status: 404 });
      }

      // Update linked prospect if exists
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, {
          $set: { status: "VISIT SCHEDULED" },
        });
      }

      // Create a new follow-up for the visit
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

      // Create notification
      await Notification.create({
        title: "Visit Scheduled",
        message: `Visit scheduled for ${followUp.customerName} on ${visitDate || "soon"}`,
        time: new Date().toISOString(),
        unread: true,
        userId: user.userId,
      });

      // Log activity
      await Activity.create({
        title: "Visit scheduled",
        detail: `Visit scheduled for ${followUp.customerName} on ${visitDate || "soon"}`,
        time: new Date().toISOString(),
        type: "visit",
        userId: user.userId,
      });

      return Response.json({ followUp });
    }

    // === POSTPONE ===
    if (body.action === "postpone") {
      const newDate = body.newDate || "";

      const followUp = await FollowUp.findByIdAndUpdate(
        id,
        {
          $set: {
            outcome: "POSTPONED",
          },
        },
        { new: true }
      ).lean();

      if (!followUp) {
        return Response.json({ error: "Follow-up not found." }, { status: 404 });
      }

      // Update linked prospect if exists
      if (followUp.prospectId) {
        await Prospect.findByIdAndUpdate(followUp.prospectId, {
          $set: { status: "POSTPONED" },
        });
      }

      // Create a new follow-up with the postponed date
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

      // Log activity
      await Activity.create({
        title: "Follow-up postponed",
        detail: `${followUp.customerName} postponed to ${newDate}`,
        time: new Date().toISOString(),
        type: "followup",
        userId: user.userId,
      });

      return Response.json({ followUp });
    }

    // === Fallback: update specific fields ===
    const allowedFields = ["status", "category", "lastContacted", "isFirstFollowUp", "outcome", "notes"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields or action to update." }, { status: 400 });
    }

    const followUp = await FollowUp.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();

    if (!followUp) {
      return Response.json({ error: "Follow-up not found." }, { status: 404 });
    }

    return Response.json({ followUp });
  } catch (error) {
    console.error("Update follow-up error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
