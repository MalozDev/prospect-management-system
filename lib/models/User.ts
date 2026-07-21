import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "DSE" | "SUPERVISOR" | "SUPERADMIN";

export interface IUser extends Document {
  name: string;
  cugSuffix: string;
  password: string;
  role: UserRole;
  region: string;
  supervisor: string;
  avatarUrl: string;
  avatarColor: string;
  lastLogin: string;
  supervisorCheckedAt: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    cugSuffix: { type: String, required: true, unique: true, trim: true, minlength: 4, maxlength: 4 },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, required: true, enum: ["DSE", "SUPERVISOR", "SUPERADMIN"] },
    region: { type: String, required: true, default: "Lusaka" },
    supervisor: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    avatarColor: { type: String, default: "" },
    lastLogin: { type: String, default: "" },
    supervisorCheckedAt: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.index({ cugSuffix: 1 });
UserSchema.index({ role: 1, supervisor: 1 });

UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...rest } = ret;
    return rest;
  },
});

export const User = mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
