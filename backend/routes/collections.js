// ════════════════════════════════════════════════════════════════════
//  COLLECTIONS ROUTES — generic GET/PUT for all 14 data keys
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const Collection = require("../models/Collection");
const logActivity = require("../utils/logActivity");

// Allowed collection keys (users excluded — handled by /api/users)
const ALLOWED = new Set([
  "singleLessons", "groupLessons", "packageLessons",
  "students", "instructors", "agents",
  "sunbeds", "sunbedRentals", "equipment", "equipmentRentals",
  "payments", "instructorAdvances", "instructorExpenses",
  "dailyExpenses", "deleteRequests",
]);

// Human-readable labels for collection keys
const KEY_LABELS = {
  singleLessons: "Single Lesson",
  groupLessons: "Group Lesson",
  packageLessons: "Package Lesson",
  students: "Student",
  instructors: "Instructor",
  agents: "Agent",
  sunbeds: "Sunbed",
  sunbedRentals: "Sunbed Rental",
  equipment: "Equipment",
  equipmentRentals: "Equipment Rental",
  payments: "Payment",
  instructorAdvances: "Instructor Advance",
  instructorExpenses: "Instructor Expense",
  dailyExpenses: "Daily Expense",
  deleteRequests: "Delete Request",
};

// Category mapping for activity log
const KEY_CATEGORIES = {
  singleLessons: "lesson", groupLessons: "lesson", packageLessons: "lesson",
  students: "student", instructors: "instructor", agents: "agent",
  sunbeds: "rental", sunbedRentals: "rental", equipment: "rental", equipmentRentals: "rental",
  payments: "payment", instructorAdvances: "expense", instructorExpenses: "expense",
  dailyExpenses: "expense", deleteRequests: "system",
};

// Get a display name for an item
function getItemName(key, item) {
  if (!item) return "Unknown";
  if (item.studentName) return item.studentName;
  if (item.name) return item.name;
  if (item.customerName) return item.customerName;
  if (item.description) return item.description;
  if (item.category) return item.category;
  return item.id || "Item";
}

// GET /api/data/:key
router.get("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED.has(key)) {
      return res.status(400).json({ error: `Invalid collection key: ${key}` });
    }

    const doc = await Collection.findOne({ key });
    res.json({ key, items: doc ? doc.items : [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to load collection" });
  }
});

// PUT /api/data/:key
router.put("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED.has(key)) {
      return res.status(400).json({ error: `Invalid collection key: ${key}` });
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items must be an array" });
    }

    // Get old items for change detection
    const oldDoc = await Collection.findOne({ key });
    const oldItems = oldDoc ? oldDoc.items : [];

    const doc = await Collection.findOneAndUpdate(
      { key },
      { key, items },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ── Activity logging (detect what changed) ──────────────────
    const label = KEY_LABELS[key] || key;
    const category = KEY_CATEGORIES[key] || "system";
    const oldMap = new Map(oldItems.map((i) => [i.id, i]));
    const newMap = new Map(items.map((i) => [i.id, i]));

    // Extract operator info from headers
    const opId = req.headers["x-operator-id"];
    const opName = req.headers["x-operator-name"];
    const operator = opId ? { id: opId, name: opName || "Unknown" } : null;
    const byOp = operator ? ` (by ${operator.name})` : "";

    // Detect added items
    for (const [id, item] of newMap) {
      if (!oldMap.has(id)) {
        const name = getItemName(key, item);
        logActivity(req.user, "created", category, `Created ${label}: ${name}${byOp}`, { key, itemId: id, name }, operator);
      }
    }

    // Detect removed items
    for (const [id, item] of oldMap) {
      if (!newMap.has(id)) {
        const name = getItemName(key, item);
        logActivity(req.user, "deleted", category, `Deleted ${label}: ${name}${byOp}`, { key, itemId: id, name }, operator);
      }
    }

    // Detect updated items (status changes, payment changes, timer actions)
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id);
      if (!oldItem) continue;
      const name = getItemName(key, newItem);

      // Status change
      if (oldItem.status !== newItem.status) {
        if (newItem.status === "in-progress") {
          logActivity(req.user, "started", category, `Started ${label}: ${name}${byOp}`, { key, itemId: id, name }, operator);
        } else if (newItem.status === "completed") {
          logActivity(req.user, "ended", category, `Completed ${label}: ${name}${byOp}`, { key, itemId: id, name }, operator);
        } else {
          logActivity(req.user, "updated", category, `${label} "${name}" status → ${newItem.status}${byOp}`, { key, itemId: id, name, status: newItem.status }, operator);
        }
      }
      // Payment status change
      else if (oldItem.paymentStatus !== newItem.paymentStatus) {
        logActivity(req.user, "payment", category, `Payment ${newItem.paymentStatus} for ${label}: ${name}${byOp}`, { key, itemId: id, name, paymentStatus: newItem.paymentStatus, amount: newItem.paidAmount || newItem.price }, operator);
      }
      // General update (something else changed)
      else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        logActivity(req.user, "updated", category, `Updated ${label}: ${name}${byOp}`, { key, itemId: id, name }, operator);
      }
    }

    // Broadcast to other clients via Socket.IO
    const io = req.app.get("io");
    const senderSocketId = req.headers["x-socket-id"];
    if (io) {
      if (senderSocketId) {
        io.except(senderSocketId).emit("collection:updated", { key, items: doc.items });
      } else {
        io.emit("collection:updated", { key, items: doc.items });
      }
    }

    res.json({ key, items: doc.items });
  } catch (err) {
    res.status(500).json({ error: "Failed to save collection" });
  }
});

module.exports = router;
