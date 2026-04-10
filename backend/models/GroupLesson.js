import mongoose, { Schema } from 'mongoose';
import { PaymentSchema } from './Payment.js';
import { LessonInstructorSchema } from './LessonInstructor.js';
const GroupParticipantSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    agentId: { type: String, default: '' },
    isFree: { type: Boolean, default: false },
    freeReason: { type: String, default: '' },
    discount: { type: Number, default: 0 },
    discountReason: { type: String, default: '' },
    finalPrice: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
    },
    payments: { type: [PaymentSchema], default: [] },
    sunbedId: { type: String, default: '' },
}, { _id: true });
GroupParticipantSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
const GroupLessonSchema = new Schema({
    _id: { type: String, default: () => `gl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    name: { type: String, required: true },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true,
    },
    instructors: { type: [LessonInstructorSchema], default: [] },
    participants: { type: [GroupParticipantSchema], default: [] },
    maxParticipants: { type: Number, default: 10 },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    zone: { type: String, default: '' },
    pricePerPerson: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled',
    },
    notes: { type: String, default: '' },
}, { timestamps: true, _id: false });
GroupLessonSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export { GroupLessonSchema, GroupParticipantSchema };
export default mongoose.model('GroupLesson', GroupLessonSchema);
