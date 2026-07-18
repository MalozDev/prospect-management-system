import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/prospect-management";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memServer: MongoMemoryServer | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null, memServer: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function startInMemoryServer(): Promise<string> {
  if (cached.memServer) {
    return cached.memServer.getUri();
  }

  console.log("🔄 Starting in-memory MongoDB (no external MongoDB detected)...");
  console.log("   📥 This may download MongoDB binaries on first run (takes ~30-60s)");
  cached.memServer = await MongoMemoryServer.create({
    instance: {
      dbPath: ".mongodb-data",
      storageEngine: "wiredTiger",
    },
  });

  const uri = cached.memServer.getUri();
  console.log(`✅ In-memory MongoDB ready at ${uri}`);
  return uri;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // First, try connecting to the configured/external MongoDB
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }).catch(async (err: unknown) => {
      // External MongoDB unavailable — fall back to in-memory
      console.warn("⚠️ External MongoDB unavailable:", err instanceof Error ? err.message : err);
      const memUri = await startInMemoryServer();
      return mongoose.connect(memUri, {
        bufferCommands: false,
      });
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

// Graceful shutdown for the in-memory server
process.on("SIGINT", async () => {
  if (cached.memServer) {
    await cached.memServer.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (cached.memServer) {
    await cached.memServer.stop();
  }
  process.exit(0);
});
