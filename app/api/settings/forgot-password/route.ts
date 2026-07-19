import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Setting } from "@/lib/models/Setting";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

const SETTING_KEY = "forgot_password_message";
const DEFAULT_MESSAGE = "Please contact your supervisor or system administrator to reset your password.";

export async function GET() {
  try {
    await connectToDatabase();

    let setting = await Setting.findOne({ key: SETTING_KEY });

    // If no message is set yet, create the default one
    if (!setting) {
      setting = await Setting.create({ key: SETTING_KEY, value: DEFAULT_MESSAGE });
    }

    return Response.json({ message: setting.value });
  } catch (error) {
    console.error("Get forgot-password message error:", error);
    return Response.json({ error: "Failed to load message." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || (user.role !== "SUPERVISOR" && user.role !== "SUPERADMIN")) {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const { message } = await request.json();

    if (!message?.trim()) {
      return Response.json({ error: "Message is required." }, { status: 400 });
    }

    const setting = await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      { value: message.trim() },
      { upsert: true, new: true }
    );

    return Response.json({ message: setting.value });
  } catch (error) {
    console.error("Update forgot-password message error:", error);
    return Response.json({ error: "Failed to update message." }, { status: 500 });
  }
}
