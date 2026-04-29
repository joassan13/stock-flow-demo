import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Branch: Model<IBranch> =
  mongoose.models.Branch ?? mongoose.model<IBranch>('Branch', BranchSchema);

export default Branch;
