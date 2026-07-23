/**
 * ═══════════════════════════════════════════════════════════════
 * Migration: Clean up legacy FCM-only push subscriptions
 * ═══════════════════════════════════════════════════════════════
 *
 * After switching from Firebase Cloud Messaging (FCM) to the standard
 * Web Push API, old subscription documents in the database still have
 * the `fcmToken` field but are missing the `endpoint` and `keys`
 * (p256dh, auth) required by the new system.
 *
 * This script:
 *   1. Connects to MongoDB
 *   2. Finds all PushSubscription documents that:
 *      a. Have an `fcmToken` field (legacy FCM schema)
 *      b. Are missing `endpoint` or `keys.p256dh`/`keys.auth`
 *   3. Deletes them
 *   4. Prints a summary
 *
 * Usage:
 *   npx tsx scripts/migrate-push-subscriptions.ts
 *
 * ⚠️ This script uses the raw MongoDB collection directly (not the
 * Mongoose model) to bypass schema validation that would reject old
 * documents when trying to read them.
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Load env vars from .env and .env.local (Next.js-style precedence).
 * No external dependencies needed — uses only Node.js built-ins.
 * .env.local takes precedence over .env.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

/** Load env vars from files. Uses process.cwd() since this script runs from project root. */
function loadEnvFiles(...paths: string[]) {
  const projectRoot = process.cwd();
  for (const file of paths) {
    try {
      const content = readFileSync(resolve(projectRoot, file), "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // File doesn't exist — skip
    }
  }
}

loadEnvFiles(".env", ".env.local");

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Migration: Clean up legacy FCM push subscriptions");
  console.log("═══════════════════════════════════════════════════\n");

  // ── 1. Connect to MongoDB ──
  const { connectToDatabase } = await import("../lib/mongodb");
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;

  if (!db) {
    console.error("❌ Failed to get database connection.");
    process.exit(1);
  }

  const collection = db.collection("pushsubscriptions");

  // ── 2. Count total documents ──
  const totalCount = await collection.countDocuments();
  console.log(`📊 Total documents in 'pushsubscriptions': ${totalCount}\n`);

  // ── 3. Find and delete legacy FCM-only subscriptions ──
  //
  // These are documents that:
  // - Have fcmToken field (old Firebase schema)
  // - OR have no endpoint or empty endpoint
  // - OR have no keys.p256dh or no keys.auth
  //
  const filter = {
    $or: [
      { fcmToken: { $exists: true } },
      {
        $or: [
          { endpoint: { $exists: false } },
          { endpoint: "" },
          { endpoint: null },
        ],
      },
      {
        $or: [
          { "keys.p256dh": { $exists: false } },
          { "keys.p256dh": null },
          { "keys.auth": { $exists: false } },
          { "keys.auth": null },
        ],
      },
    ],
  };

  const legacyCount = await collection.countDocuments(filter);
  console.log(`🔍 Found ${legacyCount} legacy/malformed subscription(s) to delete\n`);

  if (legacyCount === 0) {
    console.log("✅ Nothing to clean up — all subscriptions are valid.");
  } else {
    // Show a sample of what's being deleted
    const sample = await collection.find(filter).limit(3).toArray();
    for (const doc of sample) {
      const hasFcm = !!doc.fcmToken;
      const hasEndpoint = !!doc.endpoint;
      const hasKeys = !!(doc.keys?.p256dh && doc.keys?.auth);
      console.log(`  • _id: ${doc._id} | userId: ${doc.userId} | fcmToken: ${hasFcm} | endpoint: ${hasEndpoint} | keys: ${hasKeys}`);
    }
    if (legacyCount > 3) {
      console.log(`  ... and ${legacyCount - 3} more`);
    }
    console.log("");

    // Confirm before deleting
    console.log("⚠️  About to DELETE these documents permanently.");
    console.log("   Press Ctrl+C within 5 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Delete
    const result = await collection.deleteMany(filter);
    console.log(`🗑️  Deleted ${result.deletedCount} legacy subscription(s)\n`);
  }

  // ── 4. Summary ──
  const remainingCount = await collection.countDocuments();
  console.log("═══════════════════════════════════════════════════");
  console.log("  Migration Complete");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Total before: ${totalCount}`);
  console.log(`  Deleted:      ${legacyCount}`);
  console.log(`  Remaining:    ${remainingCount}`);
  console.log("═══════════════════════════════════════════════════\n");

  // ── 5. Drop the old unique index on fcmToken (if it still exists) ──
  try {
    await collection.dropIndex("fcmToken_1");
    console.log("🧹 Dropped legacy unique index on 'fcmToken'");
  } catch {
    // Index doesn't exist — that's fine
  }

  // Ensure the new index on endpoint exists
  try {
    await collection.createIndex({ endpoint: 1 }, { unique: true, background: true });
    console.log("✅ Ensured unique index on 'endpoint'");
  } catch {
    // Index already exists or couldn't be created
  }

  try {
    await collection.createIndex({ userId: 1 }, { background: true });
    console.log("✅ Ensured index on 'userId'");
  } catch {
    // Already exists
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB. Done!\n");
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
