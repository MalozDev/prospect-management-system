import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Sale } from "@/lib/models/Sale";
import { Activity } from "@/lib/models/Activity";
import { User } from "@/lib/models/User";
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
    const limit = Number(searchParams.get("limit")) || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (soldBy) {
      // Supervisor must verify the DSE is on their team
      if (user.role === "SUPERVISOR") {
        const dse = await User.findOne({ role: "DSE", name: soldBy, supervisor: user.name }).lean();
        if (!dse) return Response.json({ sales: [] });
      }
      filter.soldBy = soldBy;
    } else if (user.role === "DSE") {
      filter.soldBy = user.name;
    } else if (user.role === "SUPERVISOR") {
      // Supervisor only sees sales from DSEs on their team
      const teamDses = await User.find({ role: "DSE", supervisor: user.name }).select("name").lean();
      const dseNames = teamDses.map((d) => d.name);
      if (dseNames.length > 0) {
        filter.soldBy = { $in: dseNames };
      } else {
        return Response.json({ sales: [] });
      }
    }

    if (month) {
      // Match sales where date starts with YYYY-MM
      filter.date = { $regex: `^${month}` };
    } else if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    let query = Sale.find(filter).sort({ date: -1 });
    if (limit > 0) query = query.limit(limit);
    const sales = await query.lean();

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
