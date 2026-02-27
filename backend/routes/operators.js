// ════════════════════════════════════════════════════════════════════
//  OPERATORS ROUTES — CRUD for cashier operators (admin only)
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const Operator = require("../models/Operator");
const logActivity = require("../utils/logActivity");

const genId = () => Math.random().toString(36).substr(2, 9);

async function allOperatorsClient() {
  const ops = await Operator.find();
  return ops.map((o) => o.toClient());
}

// GET /api/operators — list all operators (no PIN hashes)
router.get("/", async (req, res) => {
  try {
    const operators = await allOperatorsClient();
    res.json({ operators });
  } catch (err) {
    res.status(500).json({ error: "Failed to load operators" });
  }
});

// POST /api/operators — create operator (admin only)
router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { name, pin } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: "Name and PIN are required" });
    }
    if (pin.length < 4) {
      return res.status(400).json({ error: "PIN must be at least 4 digits" });
    }

    const operator = await Operator.create({ id: genId(), name, pin });
    const operators = await allOperatorsClient();

    logActivity(req.user, "created", "operator", `Created operator: ${name}`);

    res.json({ operator: operator.toClient(), operators });
  } catch (err) {
    res.status(500).json({ error: "Failed to create operator" });
  }
});

// PUT /api/operators/:id — update operator (admin only)
router.put("/:id", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const operator = await Operator.findOne({ id: req.params.id });
    if (!operator) {
      return res.status(404).json({ error: "Operator not found" });
    }

    const { name, pin, active } = req.body;
    if (name) operator.name = name;
    if (pin) operator.pin = pin; // pre-save hook will hash
    if (active !== undefined) operator.active = active;

    await operator.save();
    const operators = await allOperatorsClient();

    logActivity(req.user, "updated", "operator", `Updated operator: ${operator.name}`);

    res.json({ operator: operator.toClient(), operators });
  } catch (err) {
    res.status(500).json({ error: "Failed to update operator" });
  }
});

// DELETE /api/operators/:id — delete operator (admin only)
router.delete("/:id", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const operator = await Operator.findOne({ id: req.params.id });
    if (!operator) {
      return res.status(404).json({ error: "Operator not found" });
    }

    const deletedName = operator.name;
    await Operator.deleteOne({ id: req.params.id });
    const operators = await allOperatorsClient();

    logActivity(req.user, "deleted", "operator", `Deleted operator: ${deletedName}`);

    res.json({ success: true, operators });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete operator" });
  }
});

module.exports = router;
