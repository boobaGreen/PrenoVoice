import { Schema, model, Document } from 'mongoose';

export interface IMenuItem extends Document {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  available: boolean;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    storeId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: String,
    available: { type: Boolean, default: true }
  },
  { collection: 'menus' }
);

export default model<IMenuItem>('MenuItem', MenuItemSchema);