import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FollowUp } from "@/lib/models/FollowUp";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { getTodayLocal } from "@/lib/time-utils";

export async function POST(_request: NextRequest) {
  const user = getUserFromRequest(_request);
  if (!user || (user.role !== "SUPERVISOR" && user.role !== "SUPERADMIN")) {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const today = getTodayLocal();

    // Move all UPCOMING follow-ups that are due today to TODAY
    const activatedToday = await FollowUp.updateMany(
      { status: "UPCOMING", expectedPurchaseDate: today },
      { $set: { status: "TODAY" } }
    );

    // Move all UPCOMING follow-ups past their date to OVERDUE
    const markedOverdue = await FollowUp.updateMany(
      { status: "UPCOMING", expectedPurchaseDate: { $lt: today } },
      { $set: { status: "OVERDUE" } }
    );

    return Response.json({
      message: "Day-end sync complete. System is ready for the next day.",
      stats: {
        activatedToday: activatedToday.modifiedCount,
        markedOverdue: markedOverdue.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Daily reset error:", error);
    return Response.json({ error: "Failed to reset daily data." }, { status: 500 });
  }
}
