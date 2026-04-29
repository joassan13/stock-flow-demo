import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IStock extends Document {
  product: Types.ObjectId;
  branch: Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStock>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

// A product can only have one stock record per branch
StockSchema.index({ product: 1, branch: 1 }, { unique: true });

const Stock: Model<IStock> =
  mongoose.models.Stock ?? mongoose.model<IStock>('Stock', StockSchema);

export default Stock;
