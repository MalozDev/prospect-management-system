import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
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

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { unread: false } },
      { new: true }
    ).lean();

    if (!notification) {
      return Response.json({ error: "Notification not found." }, { status: 404 });
    }

    return Response.json({ notification });
  } catch (error) {
    console.error("Update notification error:", error);
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

    await Notification.findByIdAndDelete(id);

    return Response.json({ message: "Notification deleted." });
  } catch (error) {
    console.error("Delete notification error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
