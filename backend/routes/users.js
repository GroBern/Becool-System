// ════════════════════════════════════════════════════════════════════
//  USERS ROUTES — CRUD for user accounts (admin only for write ops)
// ════════════════════════════════════════════════════════════════════

const router = require("express").Router();
const User = require("../models/User");
const logActivity = require("../utils/logActivity");

// Helper: generate a simple id (mirrors frontend genId)
const genId = () => Math.random().toString(36).substr(2, 9);

// Helper: get all users as client objects
async function allUsersClient() {
  const users = await User.find();
  return users.map((u) => u.toClient());
}

// Helper: broadcast users update
function broadcastUsers(req, users) {
  const io = req.app.get("io");
  const senderSocketId = req.headers["x-socket-id"];
  if (io) {
    if (senderSocketId) {
      io.except(senderSocketId).emit("users:updated", { users });
    } else {
      io.emit("users:updated", { users });
    }
  }
}

// GET /api/users — returns users without passwords
router.get("/", async (req, res) => {
  try {
    const users = await allUsersClient();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to load users" });
  }
});

// POST /api/users — create new user (admin only)
router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { username, password, name, role, pin } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: "username, password, and name are required" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const user = await User.create({
      id: genId(),
      username,
      password,
      pin: pin || "",
      name,
      role: role || "cashier",
    });

    const users = await allUsersClient();
    broadcastUsers(req, users);

    logActivity(req.user, "created", "user", `Created user account: ${name} (@${username}, ${role})`);

    res.json({ user: user.toClient(), users });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/users/:id — update user (admin only)
router.put("/:id", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { username, password, name, role, pin } = req.body;
    if (username) user.username = username;
    if (name) user.name = name;
    if (role) user.role = role;
    if (password) user.password = password; // pre-save hook will hash
    if (pin !== undefined) user.pin = pin; // pre-save hook will hash (empty string clears PIN)

    await user.save();

    const users = await allUsersClient();
    broadcastUsers(req, users);

    logActivity(req.user, "updated", "user", `Updated user account: ${user.name} (@${user.username})`);

    res.json({ user: user.toClient(), users });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/users/:id — delete user (admin only, can't delete last admin)
router.delete("/:id", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check: don't delete the last admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot delete the last admin account" });
      }
    }

    const deletedName = user.name;
    await User.deleteOne({ id: req.params.id });

    const users = await allUsersClient();
    broadcastUsers(req, users);

    logActivity(req.user, "deleted", "user", `Deleted user account: ${deletedName}`);

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
