import mongoose, { Schema } from 'mongoose';
import { PaymentSchema } from './Payment.js';
const AgentCommissionSchema = new Schema({
    _id: { type: String, default: () => `ac-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    agentId: { type: String, ref: 'Agent', required: true },
    serviceType: {
        type: String,
        enum: ['lesson', 'group-lesson'],
        required: true,
    },
    serviceId: { type: String, required: true },
    guestCount: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
    },
    payments: { type: [PaymentSchema], default: [] },
    date: { type: String, required: true },
}, { timestamps: true, _id: false });
AgentCommissionSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('AgentCommission', AgentCommissionSchema);
