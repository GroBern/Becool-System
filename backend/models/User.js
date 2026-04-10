import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
export const ALL_TABS = [
    'dashboard',
    'lessons',
    'group-lessons',
    'rentals',
    'sunbeds',
    'schedule',
    'instructors',
    'students',
    'agents',
    'payments',
    'reports',
    'settings',
];
const UserSchema = new Schema({
    _id: {
        type: String,
        default: () => `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    displayName: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'manager', 'worker'],
        default: 'worker',
    },
    allowedTabs: {
        type: [String],
        default: ['dashboard'],
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: '' },
}, { timestamps: true, _id: false });
// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
// Compare password method
UserSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};
UserSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.password;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('User', UserSchema);
