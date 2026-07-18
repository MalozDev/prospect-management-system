import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const MONGODB_URI = process.env.MONGODB_URI ?? "";

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

  console.log("🔄 Starting in-memory MongoDB (no MONGODB_URI configured)...");
  console.log("   📥 This may download MongoDB binaries on first run (takes ~30-60s)");
  cached.memServer = await MongoMemoryServer.create({
    instance: { dbPath: ".mongodb-data", storageEngine: "wiredTiger" },
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
    if (MONGODB_URI.startsWith("mongodb+srv://")) {
      // Atlas / remote — connect with longer timeout, no fallback
      cached.promise = mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
      });
    } else if (MONGODB_URI.startsWith("mongodb://")) {
      // Local MongoDB — connect with shorter timeout, no fallback
      cached.promise = mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
    } else {
      // No URI configured — use in-memory server for development
      const memUri = await startInMemoryServer();
      cached.promise = mongoose.connect(memUri, { bufferCommands: false });
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

// Graceful shutdown for in-memory server (only used in dev with no MONGODB_URI)
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
