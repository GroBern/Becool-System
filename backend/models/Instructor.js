import mongoose, { Schema } from 'mongoose';
const InstructorSchema = new Schema({
    _id: { type: String, default: () => `inst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    specialties: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    hourlyRate: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 0 },
    avatar: { type: String, default: '' },
    status: {
        type: String,
        enum: ['active', 'off-duty', 'on-leave'],
        default: 'active',
    },
    joinDate: { type: String, default: '' },
    notes: { type: String, default: '' },
}, { timestamps: true, _id: false });
InstructorSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('Instructor', InstructorSchema);
