import mongoose, { Schema, Document } from "mongoose";

export type FollowUpStatus = "TODAY" | "UPCOMING" | "COMPLETED" | "OVERDUE";
export type FollowUpCategory = "CALL" | "WHATSAPP" | "VISIT";
export type FollowUpOutcome = "" | "PENDING_REVIEW" | "SOLD" | "LOST" | "POSTPONED" | "VISIT_SCHEDULED";

export interface IFollowUp extends Document {
  customerName: string;
  phone: string;
  expectedPurchaseDate: string;
  status: FollowUpStatus;
  category: FollowUpCategory;
  isFirstFollowUp: boolean;
  lastContacted: string;
  assignedDse: string;
  outcome: FollowUpOutcome;
  prospectId: string;
  visitDate: string;
  visitTime: string;
  notes: string;
  lastRemindedAt: string;
  visitRemindedAt: string;
  followUpSeenAt: string;
}

const FollowUpSchema = new Schema<IFollowUp>(
  {
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    expectedPurchaseDate: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["TODAY", "UPCOMING", "COMPLETED", "OVERDUE"],
      default: "UPCOMING",
    },
    category: {
      type: String,
      required: true,
      enum: ["CALL", "WHATSAPP", "VISIT"],
      default: "CALL",
    },
    isFirstFollowUp: { type: Boolean, default: true },
    lastContacted: { type: String, default: "" },
    assignedDse: { type: String, required: true, trim: true },
    outcome: {
      type: String,
      default: "",
      enum: ["", "PENDING_REVIEW", "SOLD", "LOST", "POSTPONED", "VISIT_SCHEDULED"],
    },
    prospectId: { type: String, default: "" },
  visitDate: { type: String, default: "" },
  visitTime: { type: String, default: "" },
  notes: { type: String, default: "" },
  /**
   * ISO timestamp of the last time a 15-min push reminder was sent.
   * Empty string means never reminded.
   */
  lastRemindedAt: { type: String, default: "" },
  /**
   * ISO timestamp of the last time a visit-time push reminder was sent
   * (when a same-day visit's scheduled time arrives).
   * Empty string means never reminded.
   */
  visitRemindedAt: { type: String, default: "" },
  /**
   * ISO timestamp when the DSE last opened/seen this follow-up.
   * Empty string means never seen.
   */
  followUpSeenAt: { type: String, default: "" },
  },
  { timestamps: true }
);

FollowUpSchema.index({ assignedDse: 1, status: 1 });
FollowUpSchema.index({ expectedPurchaseDate: 1 });
FollowUpSchema.index({ outcome: 1 });

export const FollowUp = mongoose.models.FollowUp ?? mongoose.model<IFollowUp>("FollowUp", FollowUpSchema);
