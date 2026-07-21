import { NextRequest } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getTokenFromRequest, decodeTokenIgnoreExpiry } from "@/lib/auth";
import { addSseClient, removeSseClient } from "@/lib/notification-events";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/lib/models/Notification";

/**
 * SSE (Server-Sent Events) endpoint for real-time notification push.
 *
 * The client connects with a Bearer token, and the server keeps the
 * connection open, streaming events whenever a new notification arrives.
 *
 * Events:
 *   - "notification": { unreadCount: number, notification?: {...} }
 *   - "refresh":      { unreadCount: number }  — full badge refresh
 *
 * A keepalive comment is sent every 30s to prevent proxy timeouts.
 */
export async function GET(request: NextRequest) {
  // Support auth via both Authorization header AND query param (for EventSource)
  let user = getUserFromRequest(request);

  if (!user) {
    // Fallback: try ?token= from query param (EventSource can't set custom headers)
    const { searchParams } = new URL(request.url);
    const tokenFromQuery = searchParams.get("token");
    if (tokenFromQuery) {
      const payload = decodeTokenIgnoreExpiry(tokenFromQuery);
      if (payload) {
        user = payload;
      }
    }
  }

  if (!user) return unauthorizedResponse();

  // Send initial unread count immediately
  let initialCount = 0;
  try {
    await connectToDatabase();
    initialCount = await Notification.countDocuments({
      userId: user.userId,
      unread: true,
    });
  } catch {
    // Non-critical — client can fetch on its own
  }

  const encoder = new TextEncoder();

  // Store controller in a closure so both start() and cancel() can access it
  let sseController: ReadableStreamDefaultController | null = null;
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      sseController = controller;

      // Register this client
      addSseClient(user.userId, controller);

      // Send initial event with current count
      const initMessage = `event: init\ndata: ${JSON.stringify({ unreadCount: initialCount })}\n\n`;
      controller.enqueue(encoder.encode(initMessage));

      // Keepalive interval — send a comment every 30s to keep connection alive
      keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
          }
        }
      }, 30_000);
    },

    cancel() {
      // Clean up keepalive
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
      }
      // Unregister this client using the captured controller reference
      if (sseController) {
        removeSseClient(user.userId, sseController);
        sseController = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
