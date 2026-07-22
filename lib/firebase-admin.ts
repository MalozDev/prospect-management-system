/**
 * Server-side Firebase push notification delivery.
 *
 * Uses Node.js built-in `https` module to call Google's REST APIs directly,
 * completely bypassing `google-api-nodejs-client` / `gaxios` / `node-fetch`
 * which have timeout/compatibility issues on Node.js 24.
 *
 * Flow:
 * 1. Sign a JWT assertion with the service account's private key
 * 2. Exchange for an OAuth2 access token via oauth2.googleapis.com/token
 * 3. Call FCM v1 REST API: POST /v1/projects/{project_id}/messages:send
 *
 * ## Setup
 *
 * 1. Go to Firebase Console → Project Settings → Service Accounts
 * 2. Click "Generate New Private Key" — downloads a JSON file
 * 3. Add to .env as a single line:
 *    FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
 */

import { createPrivateKey, createSign } from "crypto";
import * as https from "https";

// ── Types ──

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  [key: string]: unknown;
}

interface FcmError {
  error?: {
    status?: string;
    details?: Array<{ reason?: string }>;
  };
}

// ── Cached values ──

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
let serviceAccount: ServiceAccount | null = null;
let configChecked = false;

/**
 * Read the service account from the environment.
 * Returns null if not configured.
 */
function getServiceAccount(): ServiceAccount | null {
  if (configChecked) return serviceAccount;
  configChecked = true;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) {
    console.warn("[FIREBASE] Not configured. Set FIREBASE_SERVICE_ACCOUNT env var.");
    return null;
  }

  try {
    serviceAccount = JSON.parse(json) as ServiceAccount;
    return serviceAccount;
  } catch (err) {
    console.error("[FIREBASE] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err);
    return null;
  }
}

/**
 * Make an HTTPS POST request and return the parsed JSON response.
 * Uses Node.js built-in `https` module — no dependency on gaxios/node-fetch.
 *
 * Rejects on non-2xx status codes so callers can handle errors in catch blocks.
 */
function httpsJsonPost(
  url: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj = new URL(url);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",          "Content-Length": String(Buffer.byteLength(bodyStr)),
      ...extraHeaders,
    };

    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: "POST",
        headers,
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");

          // Reject on non-2xx so callers handle via catch
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
            return;
          }

          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`ETIMEDOUT: POST ${url}`));
    });

    req.write(bodyStr);
    req.end();
  });
}

/**
 * Get a Google OAuth2 access token for the service account.
 * Uses the JWT bearer grant flow (RFC 7523) — no google-auth-library needed.
 *
 * The token is cached until it expires (typically 1 hour).
 */
async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
    return cachedToken.accessToken;
  }

  const sa = getServiceAccount();
  if (!sa) return null;

  try {
    const now = Math.floor(Date.now() / 1000);

    const jwtHeader = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const jwtPayload = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      })
    ).toString("base64url");

    const signingInput = `${jwtHeader}.${jwtPayload}`;
    const privateKey = createPrivateKey(sa.private_key);
    const signer = createSign("sha256");
    signer.update(signingInput);
    const signature = signer.sign(privateKey).toString("base64url");

    const jwt = `${signingInput}.${signature}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenResponse = (await httpsJsonPost("https://oauth2.googleapis.com/token", {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    })) as any;

    const accessToken = tokenResponse.access_token as string;
    const expiresIn = (tokenResponse.expires_in as number) || 3600;

    if (!accessToken) {
      console.error("[FIREBASE] Token exchange failed:", tokenResponse);
      return null;
    }

    cachedToken = { accessToken, expiresAt: now + expiresIn };
    console.log("[FIREBASE] ✅ OAuth2 token obtained (expires in", expiresIn, "s)");
    return accessToken;
  } catch (err) {
    console.error("[FIREBASE] Token fetch error:", err);
    cachedToken = null;
    return null;
  }
}

/**
 * Send a push notification via Firebase Cloud Messaging v1 REST API.
 *
 * This uses Node.js built-in `https` module instead of the Firebase Admin SDK's
 * `google-api-nodejs-client`, avoiding timeout/compatibility issues on Node.js 24.
 *
 * @returns 'sent' | 'not-configured' | 'token-expired' | 'error'
 */
export async function sendFcmNotification(
  fcmToken: string,
  title: string,
  message: string,
  url?: string
): Promise<"sent" | "not-configured" | "token-expired" | "error"> {
  const sa = getServiceAccount();
  if (!sa) return "not-configured";

  const accessToken = await getAccessToken();
  if (!accessToken) return "not-configured";

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcmResponse = (await httpsJsonPost(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        message: {
          token: fcmToken,
          notification: { title, body: message },
          webpush: { fcmOptions: { link: url || "/" } },
        },
      },
      { Authorization: `Bearer ${accessToken}` }
    )) as FcmError;

    if (!fcmResponse.error || !fcmResponse.error.status) {
      console.log("[FIREBASE] ✅ Notification sent via FCM REST API");
      return "sent";
    }

    const errorCode = fcmResponse.error.details?.[0]?.reason ||
                      fcmResponse.error.status || "";

    if (
      errorCode.includes("NOT_FOUND") ||
      errorCode.includes("UNREGISTERED") ||
      errorCode.includes("registration-token-not-registered") ||
      errorCode.includes("INVALID_ARGUMENT")
    ) {
      console.warn(`[FIREBASE] Token expired (${errorCode})`);
      return "token-expired";
    }

    console.error("[FIREBASE] API error:", JSON.stringify(fcmResponse.error));
    return "error";
  } catch (err) {
    // Check error message for token-expired patterns (non-2xx from FCM API)
    const errMsg = String(err);
    if (
      errMsg.includes("UNREGISTERED") ||
      errMsg.includes("NOT_FOUND") ||
      errMsg.includes("registration-token-not-registered") ||
      errMsg.includes("INVALID_ARGUMENT")
    ) {
      console.warn("[FIREBASE] Token expired — caller should delete subscription");
      return "token-expired";
    }
    console.error("[FIREBASE] Send error:", err);
    return "error";
  }
}
