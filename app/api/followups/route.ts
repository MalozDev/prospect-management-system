import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FollowUp } from "@/lib/models/FollowUp";
import { Notification } from "@/lib/models/Notification";
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
    const filter: Record<string, any> = {};

    if (assignedDse) {
      filter.assignedDse = assignedDse;
    } else if (user.role === "DSE") {
      filter.assignedDse = user.name;
    }

    if (status) {
      filter.status = status;
    }

    // For DSEs, exclude items with final outcomes
    if (user.role === "DSE" && !assignedDse) {
      filter.outcome = { $nin: ["SOLD", "LOST"] };
    }

    const followUps = await FollowUp.find(filter).sort({ expectedPurchaseDate: 1 }).lean();
    const today = new Date().toISOString().slice(0, 10);

    // Auto-update statuses based on dates, and create notifications for due items
    const bulkUpdates: { id: string; newStatus: string }[] = [];
    const notificationsToCreate: { title: string; message: string; userId: string }[] = [];

    for (const fu of followUps) {
      const shouldNotify = fu.status === "UPCOMING" && (
        fu.expectedPurchaseDate === today || fu.expectedPurchaseDate < today
      );

      if (fu.status === "UPCOMING" && fu.expectedPurchaseDate === today) {
        bulkUpdates.push({ id: String(fu._id), newStatus: "TODAY" });
        if (shouldNotify) {
          notificationsToCreate.push({
            title: "Follow-up Due Today",
            message: `Follow-up due today for ${fu.customerName} (${fu.phone})`,
            userId: user.userId,
          });
        }
      } else if (fu.status === "UPCOMING" && fu.expectedPurchaseDate < today) {
        bulkUpdates.push({ id: String(fu._id), newStatus: "OVERDUE" });
      }

      // Also check if an upcoming visit is due
      if (fu.category === "VISIT" && fu.visitDate && fu.visitDate <= today && fu.status === "UPCOMING") {
        if (fu.status !== "TODAY") {
          bulkUpdates.push({ id: String(fu._id), newStatus: "TODAY" });
        }
        if (shouldNotify || fu.visitDate === today) {
          notificationsToCreate.push({
            title: "Visit Scheduled Today",
            message: `Visit scheduled today for ${fu.customerName}${fu.visitDate ? ` on ${fu.visitDate}` : ""}`,
            userId: user.userId,
          });
        }
      }
    }

    // Apply bulk status updates
    for (const update of bulkUpdates) {
      await FollowUp.findByIdAndUpdate(update.id, { $set: { status: update.newStatus } });
      // Update the follow-up in the result array
      const idx = followUps.findIndex((f) => String(f._id) === update.id);
      if (idx >= 0) {
        (followUps[idx] as Record<string, unknown>).status = update.newStatus;
      }
    }

    // Create notifications (avoid duplicates by checking a hash of the content)
    for (const notif of notificationsToCreate) {
      const messageHash = notif.message.substring(0, 80);
      const existing = await Notification.findOne({
        userId: notif.userId,
        title: notif.title,
        message: { $regex: `^${messageHash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` },
      }).sort({ createdAt: -1 }).lean();

      if (!existing) {
        await Notification.create({
          title: notif.title,
          message: notif.message,
          time: new Date().toISOString(),
          unread: true,
          userId: notif.userId,
        });

        // Send browser push notification (non-blocking)
        sendPushToUser(notif.userId, {
          title: notif.title,
          message: notif.message,
          url: "/followups",
          tag: "followup",
        }).catch(() => {});
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

    const today = new Date().toISOString().slice(0, 10);
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
        time: new Date().toISOString(),
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
