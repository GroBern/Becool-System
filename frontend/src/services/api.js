// ════════════════════════════════════════════════════════════════════
//  API SERVICE — replaces localStorage load/save with HTTP calls
// ════════════════════════════════════════════════════════════════════

const BASE = "/api";

let authToken = null;
let socketId = null;
let currentOperator = null;

export function setAuthToken(token) {
  authToken = token;
}
export function setSocketId(id) {
  socketId = id;
}
export function setCurrentOperator(op) {
  currentOperator = op;
}

function headers() {
  const h = { "Content-Type": "application/json" };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  if (socketId) h["x-socket-id"] = socketId;
  if (currentOperator) {
    h["x-operator-id"] = currentOperator.id;
    h["x-operator-name"] = currentOperator.name;
  }
  return h;
}

async function request(method, path, body) {
  const opts = { method, headers: headers() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 401) {
    window.dispatchEvent(new Event("auth:expired"));
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────

export async function loginAPI(username, password) {
  return request("POST", "/auth/login", { username, password });
}

export async function verifyPinAPI(pin) {
  return request("POST", "/auth/verify-pin", { pin });
}

// ── Collections (14 data keys) ───────────────────────────────────

export async function loadCollection(key) {
  const { items } = await request("GET", `/data/${key}`);
  return items;
}

export async function saveCollection(key, items) {
  return request("PUT", `/data/${key}`, { items });
}

// ── Settings ─────────────────────────────────────────────────────

export async function loadSettings() {
  const { data } = await request("GET", "/settings");
  return data;
}

export async function saveSettingsAPI(data) {
  return request("PUT", "/settings", { data });
}

// ── Users ────────────────────────────────────────────────────────

export async function loadUsers() {
  const { users } = await request("GET", "/users");
  return users;
}

export async function createUserAPI(userData) {
  return request("POST", "/users", userData);
}

export async function updateUserAPI(id, userData) {
  return request("PUT", `/users/${id}`, userData);
}

export async function deleteUserAPI(id) {
  return request("DELETE", `/users/${id}`);
}

// ── Backup ───────────────────────────────────────────────────────

export async function exportBackupAPI() {
  return request("GET", "/backup/export");
}

export async function importBackupAPI(data) {
  return request("POST", "/backup/import", data);
}

// ── Reset ────────────────────────────────────────────────────────

export async function resetAllAPI() {
  return request("POST", "/reset");
}

// ── Operators ─────────────────────────────────────────────────────

export async function loadOperators() {
  const { operators } = await request("GET", "/operators");
  return operators;
}

export async function createOperatorAPI(data) {
  return request("POST", "/operators", data);
}

export async function updateOperatorAPI(id, data) {
  return request("PUT", `/operators/${id}`, data);
}

export async function deleteOperatorAPI(id) {
  return request("DELETE", `/operators/${id}`);
}

export async function verifyOperatorAPI(pin) {
  return request("POST", "/auth/verify-operator", { pin });
}

// ── Activity Logs ────────────────────────────────────────────────

export async function loadActivityLogs(params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.user) q.set("user", params.user);
  if (params.category) q.set("category", params.category);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  return request("GET", `/activity-logs?${q.toString()}`);
}
