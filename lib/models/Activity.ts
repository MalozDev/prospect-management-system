import mongoose, { Schema, Document } from "mongoose";

export type ActivityType = "prospect" | "call" | "followup" | "whatsapp" | "visit" | "sale" | "lost";

export interface IActivity extends Document {
  title: string;
  detail: string;
  time: string;
  type: ActivityType;
  userId: string;
}

const ActivitySchema = new Schema<IActivity>(
  {
    title: { type: String, required: true, trim: true },
    detail: { type: String, required: true, trim: true },
    time: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["prospect", "call", "followup", "whatsapp", "visit", "sale", "lost"],
    },
    userId: { type: String, default: "" },
  },
  { timestamps: true }
);

ActivitySchema.index({ createdAt: -1 });

export const Activity = mongoose.models.Activity ?? mongoose.model<IActivity>("Activity", ActivitySchema);
