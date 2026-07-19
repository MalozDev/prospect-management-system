import mongoose, { Schema, Document } from "mongoose";

export interface IPushSubscription extends Document {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1 });

export const PushSubscription =
  mongoose.models.PushSubscription ??
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
