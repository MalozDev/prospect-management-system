import mongoose, { Schema, Document } from "mongoose";

export interface IPushSubscription extends Document {
  userId: string;
  /** Web Push endpoint URL */
  endpoint: string;
  /** Web Push encryption keys */
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1 });
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export const PushSubscription =
  (mongoose.models.PushSubscription as mongoose.Model<IPushSubscription>) ??
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
