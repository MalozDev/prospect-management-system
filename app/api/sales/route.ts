import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Sale } from "@/lib/models/Sale";
import { Activity } from "@/lib/models/Activity";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const soldBy = searchParams.get("soldBy");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const month = searchParams.get("month");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (soldBy) {
      filter.soldBy = soldBy;
    } else if (user.role === "DSE") {
      filter.soldBy = user.name;
    }

    if (month) {
      // Match sales where date starts with YYYY-MM
      filter.date = { $regex: `^${month}` };
    } else if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    const sales = await Sale.find(filter).sort({ date: -1 }).lean();

    return Response.json({ sales });
  } catch (error) {
    console.error("Get sales error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();

    const body = await request.json();
    const { customer, packageName, amount, date } = body;

    if (!customer?.trim()) {
      return Response.json({ error: "Customer name is required." }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    const sale = await Sale.create({
      customer: customer.trim(),
      packageName: packageName || "ODU",
      amount: amount || 200,
      soldBy: user.name,
      date: date || today,
    });

    // Log activity
    await Activity.create({
      title: "Sale completed",
      detail: `Sale logged for ${sale.customer}`,
      time: new Date().toISOString(),
      type: "sale",
      userId: user.userId,
      dseName: user.name,
    });

    return Response.json({ sale }, { status: 201 });
  } catch (error) {
    console.error("Create sale error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
