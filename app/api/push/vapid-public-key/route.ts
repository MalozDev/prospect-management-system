/**
 * GET /api/push/vapid-public-key
 *
 * Returns the public VAPID key so the client can use it with PushManager.
 * This endpoint is unauthenticated because the public key is public
 * (it's embedded in the push subscription request).
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return Response.json(
      { error: "VAPID public key not configured." },
      { status: 500 }
    );
  }

  return Response.json({ publicKey });
}
