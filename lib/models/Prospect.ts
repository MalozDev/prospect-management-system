import mongoose, { Schema, Document } from "mongoose";

export type ProspectStatus =
  | "NEW"
  | "CONTACTED"
  | "POSTPONED"
  | "SCHEDULEVISIT"
  | "ONSITE"
  | "SOLD"
  | "LOST"
  | "FOLLOW UP"
  | "VISIT SCHEDULED";

import { PROSPECT_TITLES, type ProspectTitle } from "@/lib/prospect-titles";

export interface IProspect extends Document {
  title: ProspectTitle;
  name: string;
  phone: string;
  location: string;
  address: string;
  expectedPurchaseDate: string;
  createdAt: string;
  status: ProspectStatus;
  assignedDse: string;
  notes: string;
  lastContacted?: string;
}

const ProspectSchema = new Schema<IProspect>(
  {
    title: { type: String, enum: PROSPECT_TITLES, default: "Mr", trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    expectedPurchaseDate: { type: String, required: true },
    createdAt: { type: String, required: true, default: () => new Date().toISOString().slice(0, 10) },
    status: {
      type: String,
      required: true,
      enum: ["NEW", "CONTACTED", "POSTPONED", "SCHEDULEVISIT", "ONSITE", "SOLD", "LOST", "FOLLOW UP", "VISIT SCHEDULED"],
      default: "NEW",
    },
    assignedDse: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    lastContacted: { type: String, default: "" },
  },
  { timestamps: true }
);

ProspectSchema.index({ assignedDse: 1, createdAt: -1 });
ProspectSchema.index({ assignedDse: 1 });
ProspectSchema.index({ status: 1 });

export const Prospect = mongoose.models.Prospect ?? mongoose.model<IProspect>("Prospect", ProspectSchema);
