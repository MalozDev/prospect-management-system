import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  time: string;
  unread: boolean;
  userId: string;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    time: { type: String, required: true },
    unread: { type: Boolean, required: true, default: true },
    userId: { type: String, default: "" },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, unread: -1 });

export const Notification = mongoose.models.Notification ?? mongoose.model<INotification>("Notification", NotificationSchema);
