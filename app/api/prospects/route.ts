import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Prospect } from "@/lib/models/Prospect";
import { getTodayLocal, getNowLocalISO } from "@/lib/time-utils";
import { FollowUp } from "@/lib/models/FollowUp";
import { Notification } from "@/lib/models/Notification";
import { Activity } from "@/lib/models/Activity";
import { User } from "@/lib/models/User";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { getSupervisorUserId, sendNotification, notifyAllSuperadmins } from "@/lib/send-notification";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const assignedDse = searchParams.get("assignedDse");
    const status = searchParams.get("status");
    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const limit = Number(searchParams.get("limit")) || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (assignedDse) {
      // Supervisor must verify the DSE is on their team
      if (user.role === "SUPERVISOR") {
        const dse = await User.findOne({ role: "DSE", name: assignedDse, supervisor: user.name }).lean();
        if (!dse) return Response.json({ prospects: [] });
      }
      filter.assignedDse = assignedDse;
    } else if (user.role === "DSE") {
      filter.assignedDse = user.name;
    } else if (user.role === "SUPERVISOR") {
      // Supervisor only sees prospects from DSEs on their team
      const teamDses = await User.find({ role: "DSE", supervisor: user.name }).select("name").lean();
      const dseNames = teamDses.map((d) => d.name);
      if (dseNames.length > 0) {
        filter.assignedDse = { $in: dseNames };
      } else {
        // No DSEs on this team — return nothing
        return Response.json({ prospects: [] });
      }
    }

    if (status) {
      filter.status = status;
    }

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = createdFrom;
      if (createdTo) filter.createdAt.$lte = createdTo;
    }

    let query = Prospect.find(filter).sort({ createdAt: -1 });
    if (limit > 0) query = query.limit(limit);
    const prospects = await query.lean();

    return Response.json({ prospects });
  } catch (error) {
    console.error("Get prospects error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await request.json();
    const { title, name, phone, location, address, expectedPurchaseDate, status, notes } = body;

    if (!name?.trim() || !phone?.trim() || !location?.trim() || !address?.trim() || !expectedPurchaseDate) {
      return Response.json(
        { error: "Name, phone, location, address, and follow-up date are required." },
        { status: 400 }
      );
    }

    const today = getTodayLocal();

    const prospect = await Prospect.create({
      title: title || "Mr",
      name: name.trim(),
      phone: phone.trim(),
      location: location.trim(),
      address: address?.trim() || "",
      expectedPurchaseDate,
      createdAt: today,
      status: status || "NEW",
      assignedDse: user.name,
      notes: notes || "",
    });

    // Log activity
    await Activity.create({
      title: "Prospect created",
      detail: `${prospect.name} added as a new prospect`,
      time: getNowLocalISO(),
      type: "prospect",
      userId: user.userId,
      dseName: user.name,
    });

    // Create linked follow-up
    const computedStatus = expectedPurchaseDate === today ? "TODAY" : expectedPurchaseDate < today ? "OVERDUE" : "UPCOMING";

    const followUp = await FollowUp.create({
      customerName: prospect.name,
      phone: prospect.phone,
      expectedPurchaseDate,
      status: computedStatus,
      category: "CALL",
      isFirstFollowUp: true,
      assignedDse: user.name,
      prospectId: String(prospect._id),
      notes: notes || "",
    });

    // Create notification if follow-up is due today
    if (computedStatus === "TODAY") {
      await Notification.create({
        title: "Follow-up Due Today",
        message: `Follow-up due today for ${followUp.customerName} (${followUp.phone})`,
        time: getNowLocalISO(),
        unread: true,
        userId: user.userId,
      });
    }

    // ── Notify the DSE's supervisor about the new prospect ──
    if (user.role === "DSE") {
      const supervisorUserId = await getSupervisorUserId(user.name);
      if (supervisorUserId) {
        sendNotification({
          title: "New prospect captured",
          message: `${user.name} captured a new prospect: ${prospect.name} from ${prospect.location}`,
          userId: supervisorUserId,
          url: "/supervisor/prospects",
          tag: "prospect",
        }).catch(() => {});
      }
    }

    // ── Notify all superadmins about the new prospect ──
    notifyAllSuperadmins({
      title: "New prospect captured",
      message: `${user.name} captured a new prospect: ${prospect.name} from ${prospect.location}`,
      url: "/developer/dashboard",
      tag: "prospect",
    }).catch(() => {});

    return Response.json({ prospect, followUp }, { status: 201 });
  } catch (error) {
    console.error("Create prospect error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
