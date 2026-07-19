import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Setting } from "@/lib/models/Setting";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { TARGET_KEYS, DEFAULT_TARGET_VALUES } from "@/lib/target-keys";

export async function GET() {
  try {
    await connectToDatabase();

    const targets: Record<string, string> = {};

    for (const key of Object.values(TARGET_KEYS)) {
      const setting = await Setting.findOne({ key });
      targets[key] = setting?.value ?? DEFAULT_TARGET_VALUES[key];
    }

    return Response.json({ targets });
  } catch (error) {
    console.error("Get targets error:", error);
    return Response.json({ error: "Failed to load targets." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || (user.role !== "SUPERVISOR" && user.role !== "SUPERADMIN")) {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const body = await request.json();

    for (const key of Object.values(TARGET_KEYS)) {
      if (body[key] !== undefined) {
        const value = String(body[key]);
        if (!isNaN(Number(value)) && Number(value) > 0) {
          await Setting.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
          );
        }
      }
    }

    // Reload all targets
    const targets: Record<string, string> = {};
    for (const key of Object.values(TARGET_KEYS)) {
      const setting = await Setting.findOne({ key });
      targets[key] = setting?.value ?? DEFAULT_TARGET_VALUES[key];
    }

    return Response.json({ targets });
  } catch (error) {
    console.error("Update targets error:", error);
    return Response.json({ error: "Failed to update targets." }, { status: 500 });
  }
}
