"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  Messaging,
  isSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDW3DBL9lAV5u73xbMawzG44AfjPTbecBw",
  authDomain: "prospects-ced45.firebaseapp.com",
  projectId: "prospects-ced45",
  storageBucket: "prospects-ced45.firebasestorage.app",
  messagingSenderId: "464728831909",
  appId: "1:464728831909:web:958499fdfb0ef978a6da4c",
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase on the client.
 * Safe to call multiple times — returns the existing instance.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (app) return app;

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    return app;
  } catch {
    return null;
  }
}

/**
 * Get the Firebase Messaging instance.
 * Returns null if Firebase Messaging is not supported in this browser.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (typeof window === "undefined") return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    const fbApp = getFirebaseApp();
    if (!fbApp) return null;

    messaging = getMessaging(fbApp);
    return messaging;
  } catch {
    return null;
  }
}

/**
 * Get an FCM registration token for push notifications.
 * This replaces the old pushManager.subscribe() approach.
 *
 * @param vapidKey - Optional VAPID key from Firebase Console → Cloud Messaging → Web push certificates
 * @returns The FCM token string, or null if it couldn't be obtained.
 */
export async function getFcmToken(vapidKey?: string): Promise<string | null> {
  try {
    const msg = await getFirebaseMessaging();
    if (!msg) return null;

    const token = await getToken(msg, {
      vapidKey: vapidKey || "BNAMlM07CDd0fBORA0ZkPeSlzfDh82GMRzJnXRDVj4R95ANAIl2gkBr8lkFjhttnYf5ylZe-sAWqJrV39Lm5rYs",
    });

    return token;
  } catch {
    return null;
  }
}
