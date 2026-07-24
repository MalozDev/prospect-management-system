/**
 * Next.js instrumentation hook.
 * Runs once when the server starts (only in `next start` production mode,
 * not in serverless/serverless-edge runtimes).
 *
 * Starts the recurring follow-up reminder scheduler so push notifications
 * are automatically sent every 15 minutes for uncontacted follow-ups.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Dynamically import to avoid pulling in mongoose during build
  const { startReminderScheduler } = await import("@/lib/followup-reminder");

  // Use setImmediate to defer after the server has fully started
  setImmediate(() => {
    startReminderScheduler();
  });
}
