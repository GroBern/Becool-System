// ════════════════════════════════════════════════════════════════════
//  RESET ROUTE — clear all data from database (admin only)
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const Collection = require("../models/Collection");
const Settings = require("../models/Settings");
const User = require("../models/User");
const { seed } = require("../seed");
const logActivity = require("../utils/logActivity");

// POST /api/reset — wipe all collections, re-seed defaults
router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    logActivity(req.user, "reset", "system", `${req.user.name} reset all data`);

    // Clear all collection data
    await Collection.deleteMany({});

    // Clear settings and users, then re-seed defaults
    await Settings.deleteMany({});
    await User.deleteMany({});
    await seed();

    // Notify all clients to reload
    const io = req.app.get("io");
    if (io) {
      io.emit("data:full-reload", {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Reset failed" });
  }
});

module.exports = router;
