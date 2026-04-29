import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  sku: string;
  name: string;
  price: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product ?? mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
