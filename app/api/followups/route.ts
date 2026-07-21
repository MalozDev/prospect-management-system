import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FollowUp } from "@/lib/models/FollowUp";
import { getTodayLocal } from "@/lib/time-utils";
import { Notification } from "@/lib/models/Notification";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push-notification";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedDse = searchParams.get("assignedDse");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const limit = Number(searchParams.get("limit")) || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (assignedDse) {
      // Supervisor must verify the DSE is on their team
      if (user.role === "SUPERVISOR") {
        const dse = await User.findOne({ role: "DSE", name: assignedDse, supervisor: user.name }).lean();
        if (!dse) return Response.json({ followUps: [] });
      }
      filter.assignedDse = assignedDse;
    } else if (user.role === "DSE") {
      filter.assignedDse = user.name;
    } else if (user.role === "SUPERVISOR") {
      // Supervisor only sees follow-ups from DSEs on their team
      const teamDses = await User.find({ role: "DSE", supervisor: user.name }).select("name").lean();
      const dseNames = teamDses.map((d) => d.name);
      if (dseNames.length > 0) {
        filter.assignedDse = { $in: dseNames };
      } else {
        return Response.json({ followUps: [] });
      }
    }

    if (status) {
      filter.status = status;
    }

    // For DSEs, exclude items with final outcomes
    if (user.role === "DSE" && !assignedDse) {
      filter.outcome = { $nin: ["SOLD", "LOST"] };
    }

    let query = FollowUp.find(filter).sort({ expectedPurchaseDate: 1 });
    if (limit > 0) query = query.limit(limit);
    const followUps = await query.lean();
    const today = getTodayLocal();

    // Auto-update statuses based on dates, and create notifications for due items
    // Batch all updates into a single bulkWrite operation
    const bulkOps: import('mongoose').AnyBulkWriteOperation[] = [];
    const notificationsToCreate: { title: string; message: string; userId: string }[] = [];

    for (const fu of followUps) {
      // Reset PENDING_REVIEW items from previous days back to TODAY
      // so the DSE must re-contact them on the new day
      const isOldPending =
        fu.outcome === "PENDING_REVIEW" &&
        fu.expectedPurchaseDate < today;

      if (isOldPending) {
        bulkOps.push({
          updateOne: {
            filter: { _id: fu._id },
            update: { $set: { status: "TODAY", outcome: "" } },
          },
        });
        (fu as Record<string, unknown>).status = "TODAY";
        (fu as Record<string, unknown>).outcome = "";
        continue;
      }

      const dueNow = fu.status === "UPCOMING" && fu.expectedPurchaseDate === today;
      const overdue = fu.status === "UPCOMING" && fu.expectedPurchaseDate < today;

      if (dueNow) {
        bulkOps.push({
          updateOne: {
            filter: { _id: fu._id },
            update: { $set: { status: "TODAY" } },
          },
        });
        (fu as Record<string, unknown>).status = "TODAY";

        notificationsToCreate.push({
          title: "Follow-up Due Today",
          message: `Follow-up due today for ${fu.customerName} (${fu.phone})`,
          userId: user.userId,
        });
      } else if (overdue) {
        bulkOps.push({
          updateOne: {
            filter: { _id: fu._id },
            update: { $set: { status: "OVERDUE" } },
          },
        });
        (fu as Record<string, unknown>).status = "OVERDUE";
      }

      // Also check if an upcoming visit is due
      if (fu.category === "VISIT" && fu.visitDate && fu.visitDate <= today && fu.status === "UPCOMING") {
        bulkOps.push({
          updateOne: {
            filter: { _id: fu._id },
            update: { $set: { status: "TODAY" } },
          },
        });
        (fu as Record<string, unknown>).status = "TODAY";

        notificationsToCreate.push({
          title: "Visit Scheduled Today",
          message: `Visit scheduled today for ${fu.customerName}${fu.visitDate ? ` on ${fu.visitDate}` : ""}`,
          userId: user.userId,
        });
      }
    }

    // Execute ALL status updates as a single database round-trip
    if (bulkOps.length > 0) {
      await FollowUp.bulkWrite(bulkOps);
    }

    // Create notifications — dedup by checking existing in a single query
    if (notificationsToCreate.length > 0) {
      const existingNotifs = await Notification.find({
        userId: user.userId,
        time: today,
      }).select('title message').lean();

      const existingSet = new Set(existingNotifs.map((n) => `${n.title}|${n.message}`));

      const newNotifs = notificationsToCreate
        .filter((n) => !existingSet.has(`${n.title}|${n.message}`))
        .map((n) => ({
          title: n.title,
          message: n.message,
          time: getTodayLocal(),
          unread: true,
          userId: n.userId,
        }));

      if (newNotifs.length > 0) {
        await Notification.insertMany(newNotifs);

        // Send browser push notifications (non-blocking, fire-and-forget)
        for (const notif of newNotifs) {
          sendPushToUser(notif.userId, {
            title: notif.title,
            message: notif.message,
            url: "/followups",
            tag: "followup",
          }).catch(() => {});
        }
      }
    }

    return Response.json({ followUps });
  } catch (error) {
    console.error("Get follow-ups error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await request.json();
    const { customerName, phone, expectedPurchaseDate, category, visitDate, prospectId, notes } = body;

    if (!customerName?.trim() || !phone?.trim() || !expectedPurchaseDate) {
      return Response.json(
        { error: "Customer name, phone, and expected purchase date are required." },
        { status: 400 }
      );
    }

    const today = getTodayLocal();
    const computedStatus = expectedPurchaseDate === today ? "TODAY" : expectedPurchaseDate < today ? "OVERDUE" : "UPCOMING";

    const followUp = await FollowUp.create({
      customerName: customerName.trim(),
      phone: phone.trim(),
      expectedPurchaseDate,
      status: computedStatus,
      category: category || "CALL",
      isFirstFollowUp: true,
      assignedDse: user.name,
      prospectId: prospectId || "",
      visitDate: visitDate || "",
      notes: notes || "",
    });

    // Create notification for new follow-up
    if (computedStatus === "TODAY") {
      await Notification.create({
        title: "Follow-up Due Today",
        message: `Follow-up due today for ${followUp.customerName} (${followUp.phone})`,
        time: getTodayLocal(),
        unread: true,
        userId: user.userId,
      });

      // Send browser push notification (non-blocking)
      sendPushToUser(user.userId, {
        title: "Follow-up Due Today",
        message: `Follow-up due today for ${followUp.customerName} (${followUp.phone})`,
        url: "/followups",
        tag: "followup",
      }).catch(() => {});
    }

    return Response.json({ followUp }, { status: 201 });
  } catch (error) {
    console.error("Create follow-up error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
