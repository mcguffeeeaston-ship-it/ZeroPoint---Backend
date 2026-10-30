import mongoose, { Schema, Document } from "mongoose";

export interface IFriendEntry {
  accountId: string;
  status: "ACCEPTED" | "PENDING" | "INCOMING";
  created: Date;
}

export interface IFriendDocument extends Document {
  accountId: string;
  friends: IFriendEntry[];
}

const FriendSchema = new Schema<IFriendDocument>(
  {
    accountId: { type: String, required: true, unique: true, index: true },
    friends: [
      {
        accountId: { type: String, required: true },
        status: { type: String, enum: ["ACCEPTED", "PENDING", "INCOMING"], default: "PENDING" },
        created: { type: Date, default: Date.now },
      },
    ],
  },
  { collection: "friends" }
);

export const FriendModel = mongoose.models.Friend || mongoose.model<IFriendDocument>("Friend", FriendSchema);
export default FriendModel;
