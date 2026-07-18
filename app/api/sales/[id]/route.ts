import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Sale } from "@/lib/models/Sale";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_request);
  if (!user) return unauthorizedResponse();

  try {
    await connectToDatabase();
    const { id } = await params;

    const sale = await Sale.findByIdAndDelete(id).lean();

    if (!sale) {
      return Response.json({ error: "Sale not found." }, { status: 404 });
    }

    return Response.json({ message: "Sale deleted successfully." });
  } catch (error) {
    console.error("Delete sale error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
