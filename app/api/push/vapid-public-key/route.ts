import { getPublicKey } from "@/lib/push-notification";

export async function GET() {
  try {
    const publicKey = await getPublicKey();
    return Response.json({ publicKey });
  } catch (error) {
    console.error("Get VAPID key error:", error);
    return Response.json({ error: "Failed to get public key." }, { status: 500 });
  }
}
