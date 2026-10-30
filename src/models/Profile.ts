import mongoose, { Schema, Document } from "mongoose";

export interface IProfileDocument extends Document {
  accountId: string;
  profileId: string;
  rvn: number;
  commandRevision: number;
  data: any;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfileDocument>(
  {
    accountId: { type: String, required: true, index: true },
    profileId: { type: String, required: true, index: true },
    rvn: { type: Number, default: 1 },
    commandRevision: { type: Number, default: 1 },
    data: { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "profiles" }
);

ProfileSchema.index({ accountId: 1, profileId: 1 }, { unique: true });

export const ProfileModel = mongoose.models.Profile || mongoose.model<IProfileDocument>("Profile", ProfileSchema);
export default ProfileModel;
