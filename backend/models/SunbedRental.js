import mongoose, { Schema } from 'mongoose';
import { PaymentSchema } from './Payment.js';
const SunbedRentalSchema = new Schema({
    _id: { type: String, default: () => `sb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    bedNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    pricePerHour: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    freeReason: { type: String, default: '' },
    linkedLessonId: { type: String, default: '' },
    linkedGroupLessonId: { type: String, default: '' },
    returnedAt: { type: String, default: null },
    status: {
        type: String,
        enum: ['active', 'returned', 'reserved'],
        default: 'active',
    },
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
SunbedRentalSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('SunbedRental', SunbedRentalSchema);
