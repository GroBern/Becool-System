import { Schema } from 'mongoose';
export const PaymentSchema = new Schema({
    amount: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'card', 'online'], required: true },
    date: { type: String, required: true },
    note: { type: String, default: '' },
}, { _id: true });
PaymentSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
