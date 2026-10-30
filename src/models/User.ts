import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  accountId: string;
  username: string;
  email: string;
  password?: string;
  discordId?: string;
  banned: boolean;
  banReason?: string;
  hwid?: string;
  server: boolean;
  created: Date;
}

const UserSchema = new Schema<IUser>(
  {
    accountId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: false },
    discordId: { type: String, default: null },
    banned: { type: Boolean, default: false },
    banReason: { type: String, default: "" },
    hwid: { type: String, default: null, index: true },
    server: { type: Boolean, default: false },
    created: { type: Date, default: Date.now },
  },
  { collection: "users" }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default UserModel;
