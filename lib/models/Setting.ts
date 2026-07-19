import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: string;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export const Setting =
  mongoose.models.Setting ?? mongoose.model<ISetting>("Setting", SettingSchema);
