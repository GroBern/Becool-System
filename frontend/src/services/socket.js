// ════════════════════════════════════════════════════════════════════
//  SOCKET.IO CLIENT — real-time data sync
// ════════════════════════════════════════════════════════════════════

import { io } from "socket.io-client";
import { setSocketId } from "./api";

let socket = null;

/**
 * Connect to the Socket.IO server.
 * @param {string} token - JWT token for auth
 * @param {Function} onEvent - callback(type, key, data)
 *   type: "collection" | "settings" | "users" | "reload"
 */
export function connectSocket(token, onEvent) {
  if (socket) socket.disconnect();

  // In dev: Vite proxy handles /socket.io → backend:5000
  // In production: frontend served from same server, so "/" works directly
  socket = io({
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    setSocketId(socket.id);
    console.log("[Socket] Connected:", socket.id);
  });

  socket.on("collection:updated", ({ key, items }) => {
    onEvent("collection", key, items);
  });

  socket.on("settings:updated", ({ data }) => {
    onEvent("settings", null, data);
  });

  socket.on("users:updated", ({ users }) => {
    onEvent("users", null, users);
  });

  socket.on("data:full-reload", () => {
    onEvent("reload", null, null);
  });

  socket.on("disconnect", (reason) => {
    setSocketId(null);
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("[Socket] Connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  setSocketId(null);
}
