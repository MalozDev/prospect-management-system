import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    if (MONGODB_URI.startsWith("mongodb+srv://")) {
      // Atlas / remote
      // Fix local DNS resolution issues in development only
      if (process.env.NODE_ENV !== "production") {
        const dns = await import("dns");
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      }

      cached.promise = mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
    } else if (MONGODB_URI.startsWith("mongodb://")) {
      // Local MongoDB — connect with shorter timeout
      cached.promise = mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
    } else {
      // No URI configured — dynamically load and start in-memory MongoDB (dev only)
      console.log("🔄 No MONGODB_URI set — starting in-memory MongoDB...");
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const memServer = await MongoMemoryServer.create({
        instance: { dbPath: ".mongodb-data", storageEngine: "wiredTiger" },
      });
      cached.promise = mongoose.connect(memServer.getUri(), {
        bufferCommands: false,
        maxPoolSize: 5,
      });
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
