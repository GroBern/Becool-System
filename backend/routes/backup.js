// ════════════════════════════════════════════════════════════════════
//  BACKUP ROUTES — export/import all data
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const Collection = require("../models/Collection");
const Settings = require("../models/Settings");
const User = require("../models/User");
const logActivity = require("../utils/logActivity");

// GET /api/backup/export — download all data as JSON (admin only)
router.get("/export", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const backup = {};

    // All collections
    const collections = await Collection.find();
    for (const c of collections) {
      backup[`bc_${c.key}`] = c.items;
    }

    // Settings
    const settings = await Settings.findOne({ _singleton: "settings" });
    if (settings) {
      backup.bc_settings = settings.data;
    }

    // Users (without passwords)
    const users = await User.find();
    backup.bc_users = users.map((u) => u.toClient());

    logActivity(req.user, "export", "system", `${req.user.name} exported backup data`);

    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: "Export failed" });
  }
});

// POST /api/backup/import — restore data from JSON blob (admin only)
router.post("/import", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const data = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Invalid backup data" });
    }

    for (const [rawKey, value] of Object.entries(data)) {
      // Strip bc_ prefix if present
      const key = rawKey.startsWith("bc_") ? rawKey.slice(3) : rawKey;

      if (key === "settings" && value && typeof value === "object") {
        await Settings.findOneAndUpdate(
          { _singleton: "settings" },
          { data: value },
          { upsert: true, setDefaultsOnInsert: true }
        );
      } else if (key === "users" && Array.isArray(value)) {
        // Re-create users from backup (with plaintext passwords if present, or skip password)
        for (const u of value) {
          if (u.id && u.username && u.name && u.role) {
            await User.findOneAndUpdate(
              { id: u.id },
              { id: u.id, username: u.username, name: u.name, role: u.role },
              { upsert: true, setDefaultsOnInsert: true }
            );
          }
        }
      } else if (key === "auth") {
        // Skip auth — it's a client-side session token
      } else if (Array.isArray(value)) {
        await Collection.findOneAndUpdate(
          { key },
          { key, items: value },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }

    // Notify all clients to reload
    const io = req.app.get("io");
    if (io) {
      io.emit("data:full-reload", {});
    }

    logActivity(req.user, "import", "system", `${req.user.name} imported backup data`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Import failed" });
  }
});

module.exports = router;
