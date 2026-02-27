// ════════════════════════════════════════════════════════════════════
//  SOCKET.IO — auth + connection handling
// ════════════════════════════════════════════════════════════════════

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

module.exports = function initSocket(io) {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] ${socket.user.name} connected (${socket.id})`);

    socket.on("disconnect", () => {
      console.log(`[Socket] ${socket.user.name} disconnected`);
    });
  });

  return io;
};
