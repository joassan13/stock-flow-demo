import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type MovementType = 'entry' | 'exit' | 'transfer';
export type MovementStatus = 'pending' | 'processed' | 'failed';

export interface IMovement extends Document {
  type: MovementType;
  product: Types.ObjectId;
  fromBranch?: Types.ObjectId;
  toBranch?: Types.ObjectId;
  quantity: number;
  status: MovementStatus;
  failureReason?: string;
  retries: number;
  createdAt: Date;
  updatedAt: Date;
}

const MovementSchema = new Schema<IMovement>(
  {
    type: {
      type: String,
      enum: ['entry', 'exit', 'transfer'] satisfies MovementType[],
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // Origin branch — required for 'exit' and 'transfer'
    fromBranch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    // Destination branch — required for 'entry' and 'transfer'
    toBranch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'] satisfies MovementStatus[],
      default: 'pending',
    },
    failureReason: {
      type: String,
      default: null,
    },
    retries: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Efficient queries by status and by branch (used in dashboard filters)
MovementSchema.index({ status: 1 });
MovementSchema.index({ fromBranch: 1, toBranch: 1 });
MovementSchema.index({ createdAt: -1 });

const Movement: Model<IMovement> =
  mongoose.models.Movement ??
  mongoose.model<IMovement>('Movement', MovementSchema);

export default Movement;
