import mongoose, { Schema } from 'mongoose';
const StudentSchema = new Schema({
    _id: { type: String, default: () => `stu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner',
    },
    age: { type: Number, default: 0 },
    emergencyContact: { type: String, default: '' },
    emergencyPhone: { type: String, default: '' },
    joinDate: { type: String, default: '' },
    totalLessons: { type: Number, default: 0 },
    notes: { type: String, default: '' },
}, { timestamps: true, _id: false });
StudentSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('Student', StudentSchema);
