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

      // ════════════════════════════════════════════════════════════
      // SRV bypass: The MongoDB driver's internal SRV resolver can
      // fail with ESERVFAIL in some environments even though system
      // DNS resolves correctly. We resolve SRV + TXT records using
      // Node.js's dns module (which works) and build a direct
      // mongodb:// connection string from the resolved addresses.
      // ════════════════════════════════════════════════════════════
      cached.promise = (async () => {
        const dns = await import("dns");

        // Parse the original SRV URI to extract auth + db + params
        const srvUrl = new URL(MONGODB_URI);
        const clusterHost = srvUrl.hostname;

        // Resolve SRV records (_mongodb._tcp.<cluster>) → host:port pairs
        const srvRecords = await new Promise<Array<{ name: string; port: number }>>(
          (resolve, reject) => {
            dns.resolveSrv(`_mongodb._tcp.${clusterHost}`, (err, records) => {
              if (err) reject(err);
              else resolve(records);
            });
          }
        );

        // Resolve TXT records for connection options (authSource, replicaSet, etc.)
        const txtRecords = await new Promise<string[][]>((resolve, reject) => {
          dns.resolveTxt(clusterHost, (err, records) => {
            if (err) reject(err);
            else resolve(records);
          });
        });

        // Build host:port list: host1:27017,host2:27017,host3:27017
        const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");

        // Extract auth credentials (username:password@)
        // ⚠️  URL.username and URL.password return raw percent-encoded values.
        //    DO NOT call encodeURIComponent() on them — that would double-encode
        //    the `%` signs. MongoDB's driver will decode percent-encoded chars.
        const authPart =
          srvUrl.username || srvUrl.password
            ? `${srvUrl.username}:${srvUrl.password}@`
            : "";

        // Database path (e.g. /prospects)
        const dbPath = srvUrl.pathname || "/prospect-management";

        // Merge original query params + TXT record params
        const mergedParams = new URLSearchParams(srvUrl.searchParams.toString());
        for (const txtChunks of txtRecords) {
          const paramStr = txtChunks.join("");
          for (const p of paramStr.split("&")) {
            const [k, v] = p.split("=");
            if (k && v && !mergedParams.has(k)) {
              mergedParams.set(k, v);
            }
          }
        }

        const directUri = `mongodb://${authPart}${hosts}${dbPath}?${mergedParams.toString()}`;

        console.log("[MONGODB] SRV bypass — resolved", srvRecords.length, "hosts");

        // ═══ TLS note ═══
        // The original `mongodb+srv://` scheme implies TLS is required.
        // When we bypass SRV and build a `mongodb://` URI, the driver no
        // longer knows TLS is needed. We must explicitly set `tls: true`
        // here or Atlas will reject the plaintext connection.
        return mongoose.connect(directUri, {
          bufferCommands: false,
          maxPoolSize: 10,
          minPoolSize: 2,
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          tls: true,
        });
      })();
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
