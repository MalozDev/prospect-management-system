import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Prospect } from "@/lib/models/Prospect";
import { FollowUp } from "@/lib/models/FollowUp";
import { Notification } from "@/lib/models/Notification";
import { Activity } from "@/lib/models/Activity";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

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

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = createdFrom;
      if (createdTo) filter.createdAt.$lte = createdTo;
    }

    const prospects = await Prospect.find(filter).sort({ createdAt: -1 }).lean();

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

    const today = new Date().toISOString().slice(0, 10);

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
      time: new Date().toISOString(),
      type: "prospect",
      userId: user.userId,
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
        time: new Date().toISOString(),
        unread: true,
        userId: user.userId,
      });
    }

    return Response.json({ prospect, followUp }, { status: 201 });
  } catch (error) {
    console.error("Create prospect error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
