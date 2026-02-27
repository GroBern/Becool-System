// ════════════════════════════════════════════════════════════════════
//  SETTINGS ROUTES — GET/PUT singleton settings document
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const Settings = require("../models/Settings");
const logActivity = require("../utils/logActivity");

// GET /api/settings
router.get("/", async (req, res) => {
  try {
    const doc = await Settings.findOne({ _singleton: "settings" });
    res.json({ data: doc ? doc.data : {} });
  } catch (err) {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// PUT /api/settings
router.put("/", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "data must be an object" });
    }

    const doc = await Settings.findOneAndUpdate(
      { _singleton: "settings" },
      { data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Broadcast to other clients
    const io = req.app.get("io");
    const senderSocketId = req.headers["x-socket-id"];
    if (io) {
      if (senderSocketId) {
        io.except(senderSocketId).emit("settings:updated", { data: doc.data });
      } else {
        io.emit("settings:updated", { data: doc.data });
      }
    }

    logActivity(req.user, "updated", "settings", `${req.user.name} updated settings`);

    res.json({ data: doc.data });
  } catch (err) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

module.exports = router;
