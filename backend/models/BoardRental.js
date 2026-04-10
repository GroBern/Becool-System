import mongoose, { Schema } from 'mongoose';
import { PaymentSchema } from './Payment.js';
const BoardRentalSchema = new Schema({
    _id: { type: String, default: () => `rent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    boardType: {
        type: String,
        enum: ['longboard', 'shortboard', 'foam', 'sup', 'bodyboard'],
        required: true,
    },
    boardNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    rentedAt: { type: String, required: true },
    dueAt: { type: String, required: true },
    returnedAt: { type: String, default: null },
    pricePerHour: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['active', 'returned', 'overdue'],
        default: 'active',
    },
    deposit: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    freeReason: { type: String, default: '' },
    discount: { type: Number, default: 0 },
    discountReason: { type: String, default: '' },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
    },
    payments: { type: [PaymentSchema], default: [] },
    notes: { type: String, default: '' },
}, { timestamps: true, _id: false });
BoardRentalSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('BoardRental', BoardRentalSchema);
