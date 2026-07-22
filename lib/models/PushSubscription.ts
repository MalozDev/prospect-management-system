import mongoose, { Schema, Document } from "mongoose";

export interface IPushSubscription extends Document {
  userId: string;
  /** Web Push endpoint URL (for standard push subscriptions) */
  endpoint: string;
  /** Web Push encryption keys (for standard push subscriptions) */
  keys?: {
    p256dh: string;
    auth: string;
  };
  /** Firebase FCM registration token (for Firebase push) */
  fcmToken?: string;
  userAgent: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, default: "" },
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },
    fcmToken: { type: String, sparse: true },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1 });
PushSubscriptionSchema.index({ fcmToken: 1 }, { sparse: true, unique: true });

export const PushSubscription =
  mongoose.models.PushSubscription ??
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
