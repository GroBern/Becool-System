import mongoose, { Schema } from 'mongoose';
const AgentSchema = new Schema({
    _id: { type: String, default: () => `agt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    commissionType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage',
    },
    commissionRate: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    notes: { type: String, default: '' },
}, { timestamps: true, _id: false });
AgentSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('Agent', AgentSchema);
