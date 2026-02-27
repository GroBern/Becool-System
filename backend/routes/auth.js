// ════════════════════════════════════════════════════════════════════
//  AUTH ROUTES — login & PIN verify
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Operator = require("../models/Operator");
const authMiddleware = require("../middleware/auth");
const { JWT_SECRET, JWT_EXPIRES } = require("../config");
const logActivity = require("../utils/logActivity");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const payload = { id: user.id, username: user.username, name: user.name, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    logActivity(payload, "login", "auth", `${user.name} logged in`);

    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/verify-pin — verify user's PIN for action confirmation
router.post("/verify-pin", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "PIN required" });
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.pin) {
      return res.status(400).json({ error: "No PIN set for this account. Ask admin to set your PIN." });
    }

    if (!(await user.comparePin(pin))) {
      return res.status(401).json({ error: "Incorrect PIN" });
    }

    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// POST /api/auth/verify-operator — identify operator by PIN
router.post("/verify-operator", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "PIN required" });
    }

    const operators = await Operator.find({ active: true });
    if (operators.length === 0) {
      return res.status(400).json({ error: "No operators configured. Ask admin to add operators in Settings." });
    }

    // Check PIN against all active operators
    for (const op of operators) {
      if (await op.comparePin(pin)) {
        return res.json({ valid: true, operator: op.toClient() });
      }
    }

    return res.status(401).json({ error: "Incorrect PIN" });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;
