const ActivityLog = require("../models/ActivityLog");

/**
 * Log a user activity.
 * @param {object} user - { id, name, role } from req.user
 * @param {string} action - e.g. "created", "updated", "deleted", "login", "started", "ended"
 * @param {string} category - e.g. "lesson", "student", "payment", "expense", "rental", "settings", "auth"
 * @param {string} description - human-readable description
 * @param {object} [details] - optional extra data
 * @param {object} [operator] - optional { id, name } of the operator
 */
async function logActivity(user, action, category, description, details = null, operator = null) {
  try {
    await ActivityLog.create({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      category,
      description,
      operatorId: operator?.id || null,
      operatorName: operator?.name || null,
      details,
    });
  } catch (err) {
    // Logging should never break the main flow
    console.error("[ActivityLog] Failed to log:", err.message);
  }
}

module.exports = logActivity;
