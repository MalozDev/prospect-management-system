import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Prospect } from "@/lib/models/Prospect";
import { Activity } from "@/lib/models/Activity";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();
    const { id } = await params;
    const prospect = await Prospect.findById(id).lean();

    if (!prospect) {
      return Response.json({ error: "Prospect not found." }, { status: 404 });
    }

    return Response.json({ prospect });
  } catch (error) {
    console.error("Get prospect error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

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

    const allowedFields = ["title", "name", "phone", "location", "address", "expectedPurchaseDate", "status", "notes"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const prospect = await Prospect.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();

    if (!prospect) {
      return Response.json({ error: "Prospect not found." }, { status: 404 });
    }

    // Log activity for status changes
    if (updates.status) {
      await Activity.create({
        title: `Status updated to ${updates.status}`,
        detail: `${prospect.name}: status changed to ${updates.status}`,
        time: new Date().toISOString(),
        type: updates.status === "SOLD" ? "sale" : updates.status === "LOST" ? "lost" : "prospect",
        userId: user.userId,
        dseName: user.name,
      });
    }

    return Response.json({ prospect });
  } catch (error) {
    console.error("Update prospect error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();
    const { id } = await params;

    const prospect = await Prospect.findByIdAndDelete(id).lean();

    if (!prospect) {
      return Response.json({ error: "Prospect not found." }, { status: 404 });
    }

    return Response.json({ message: "Prospect deleted successfully." });
  } catch (error) {
    console.error("Delete prospect error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
