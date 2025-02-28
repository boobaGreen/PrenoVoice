import { Schema, model, Document, Types } from 'mongoose';
import { OrderStatus, CancellationReason } from '../constants/orderEnums.js';

// Interfaccia per le info cliente
interface ICustomerInfo {
  name: string;
  phone?: string;
  address?: string;
}

// Interfaccia per un singolo elemento dell'ordine
interface IOrderItem {
  menuItem: Types.ObjectId;
  quantity: number;
  notes?: string;
}

export interface IOrder extends Document {
  storeId: string;
  items: IOrderItem[];
  totalPrice: number;
  status: OrderStatus;
  slot: number;
  orderTime: Date;
  customerInfo: ICustomerInfo;
  notes?: string;
  cancellationReason?: CancellationReason | string;
  cancellationNotes?: string;
}

const OrderItemSchema = new Schema<IOrderItem>({
  menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: String
});

const OrderSchema = new Schema<IOrder>({
  storeId: { type: String, required: true },
  items: { type: [OrderItemSchema], required: true },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING
  },
  slot: { type: Number, required: true },
  orderTime: { type: Date, default: Date.now },
  customerInfo: {
    name: { type: String, required: true },
    phone: String,
    address: String
  },
  notes: String,
  cancellationReason: String,
  cancellationNotes: String
});

export default model<IOrder>('Order', OrderSchema);