import mongoose, { Schema } from 'mongoose';
const SettingsSchema = new Schema({
    _id: { type: String, default: () => `settings-${Date.now()}` },
    schoolName: { type: String, default: '' },
    schoolPhone: { type: String, default: '' },
    schoolEmail: { type: String, default: '' },
    schoolAddress: { type: String, default: '' },
}, { timestamps: true, _id: false });
SettingsSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    },
});
export default mongoose.model('Settings', SettingsSchema);
