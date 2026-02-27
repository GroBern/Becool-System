const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true }, // created, updated, deleted, login, payment, started, ended, etc.
  category: { type: String, required: true }, // lesson, student, payment, expense, rental, settings, auth, etc.
  description: { type: String, required: true },
  operatorId: { type: String, default: null },
  operatorName: { type: String, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: null }, // extra data (item name, amount, etc.)
  timestamp: { type: Date, default: Date.now, index: true },
});

// Auto-expire logs after 90 days (optional, keeps DB clean)
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
