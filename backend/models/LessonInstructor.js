import { Schema } from 'mongoose';
import { PaymentSchema } from './Payment.js';
export const LessonInstructorSchema = new Schema({
    instructorId: { type: String, ref: 'Instructor', required: true },
    payType: { type: String, enum: ['percentage', 'fixed'], required: true },
    payRate: { type: Number, default: 0 },
    calculatedPay: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
    },
    payments: { type: [PaymentSchema], default: [] },
}, { _id: true });
LessonInstructorSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
