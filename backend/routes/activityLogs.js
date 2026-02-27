// ════════════════════════════════════════════════════════════════════
//  ACTIVITY LOGS ROUTE — admin only, view all user activities
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const ActivityLog = require("../models/ActivityLog");

// GET /api/activity-logs?page=1&limit=50&user=userId&category=lesson&from=2024-01-01&to=2024-12-31
router.get("/", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.user) filter.userId = req.query.user;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
      if (req.query.to) filter.timestamp.$lte = new Date(req.query.to + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load activity logs" });
  }
});

module.exports = router;
