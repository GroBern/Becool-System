import mongoose, { Schema } from 'mongoose';
import { PaymentSchema } from './Payment.js';
import { LessonInstructorSchema } from './LessonInstructor.js';
const LessonSchema = new Schema({
    _id: { type: String, default: () => `les-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
    name: { type: String, required: true },
    type: { type: String, enum: ['private', 'kids'], required: true },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true,
    },
    instructors: { type: [LessonInstructorSchema], default: [] },
    studentIds: { type: [String], default: [] },
    maxStudents: { type: Number, default: 1 },
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
    agentId: { type: String, default: '' },
    isFree: { type: Boolean, default: false },
    freeReason: { type: String, default: '' },
    discount: { type: Number, default: 0 },
    discountReason: { type: String, default: '' },
    totalAmount: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
    },
    payments: { type: [PaymentSchema], default: [] },
    includedSunbedIds: { type: [String], default: [] },
    notes: { type: String, default: '' },
}, { timestamps: true, _id: false });
LessonSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export { LessonSchema };
export default mongoose.model('Lesson', LessonSchema);
