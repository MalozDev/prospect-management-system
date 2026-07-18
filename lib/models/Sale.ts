import mongoose, { Schema, Document } from "mongoose";

export interface ISale extends Document {
  customer: string;
  packageName: string;
  amount: number;
  soldBy: string;
  date: string;
}

const SaleSchema = new Schema<ISale>(
  {
    customer: { type: String, required: true, trim: true },
    packageName: { type: String, required: true, default: "ODU" },
    amount: { type: Number, required: true, default: 200 },
    soldBy: { type: String, required: true, trim: true },
    date: { type: String, required: true, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

SaleSchema.index({ soldBy: 1, date: -1 });
SaleSchema.index({ date: -1 });

export const Sale = mongoose.models.Sale ?? mongoose.model<ISale>("Sale", SaleSchema);
