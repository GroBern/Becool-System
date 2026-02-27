// ════════════════════════════════════════════════════════════════════
//  SERVER ENTRY — Express + Socket.IO + MongoDB
// ════════════════════════════════════════════════════════════════════

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const { PORT, MONGO_URI, NODE_ENV } = require("./config");
const { seed } = require("./seed");
const authMiddleware = require("./middleware/auth");
const initSocket = require("./socket");

const app = express();
const server = http.createServer(app);

// ── CORS — allow frontend dev server + production ─────────────────
const corsOrigins = NODE_ENV === "production"
  ? false // same-origin in production (served from same server)
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

// Make io accessible in route handlers
app.set("io", io);

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── API Routes ────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/data", authMiddleware, require("./routes/collections"));
app.use("/api/settings", authMiddleware, require("./routes/settings"));
app.use("/api/users", authMiddleware, require("./routes/users"));
app.use("/api/backup", authMiddleware, require("./routes/backup"));
app.use("/api/reset", authMiddleware, require("./routes/reset"));
app.use("/api/operators", authMiddleware, require("./routes/operators"));
app.use("/api/activity-logs", authMiddleware, require("./routes/activityLogs"));

// ── Health check ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", env: NODE_ENV }));

// ── Serve frontend build in production ────────────────────────────
if (NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "..", "frontend", "dist");
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Socket.IO ─────────────────────────────────────────────────────
initSocket(io);

// ── Connect & Start ───────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("[MongoDB] Connected to", MONGO_URI);
    await seed();
    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT} (${NODE_ENV})`);
      if (NODE_ENV === "production") {
        console.log(`[Server] Serving frontend from ../frontend/dist`);
      }
    });
  })
  .catch((err) => {
    console.error("[MongoDB] Connection failed:", err.message);
    process.exit(1);
  });
