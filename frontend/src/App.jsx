import { useState, useEffect, useCallback, useRef } from "react";
import { Ctx, PinVerifyProvider } from "./context";
import { DEF_SETTINGS, DATA_KEYS } from "./constants";
import { Navbar } from "./components/layout";
import { LoginPage } from "./pages/login";
import { C, S } from "./styles";
import {
  setAuthToken,
  loadCollection,
  saveCollection,
  loadSettings,
  saveSettingsAPI,
  loadUsers,
  loadOperators,
  resetAllAPI,
} from "./services/api";
import { connectSocket, disconnectSocket } from "./services/socket";
import {
  DashboardPage,
  AdminDashboardPage,
  ActivitiesPage,
  SingleLessonsPage,
  GroupLessonsPage,
  PackageLessonsPage,
  StudentsPage,
  InstructorsPage,
  AgentsPage,
  ExpensesPage,
  FinancesPage,
  SunbedsPage,
  EquipmentPage,
  PaymentsPage,
  ReportsPage,
  SettingsPage,
  DeleteRequestsPage,
  ActivityLogPage,
} from "./pages";

// ════════════════════════════════════════════════════════════════════
//  PAGE REGISTRY
// ════════════════════════════════════════════════════════════════════
const PG = {
  dashboard: DashboardPage,
  activities: ActivitiesPage,
  single: SingleLessonsPage,
  group: GroupLessonsPage,
  packages: PackageLessonsPage,
  students: StudentsPage,
  instructors: InstructorsPage,
  expenses: ExpensesPage,
  finances: FinancesPage,
  agents: AgentsPage,
  sunbeds: SunbedsPage,
  equipment: EquipmentPage,
  payments: PaymentsPage,
  reports: ReportsPage,
  settings: SettingsPage,
  deleteRequests: DeleteRequestsPage,
  activityLog: ActivityLogPage,
};

// Data keys excluding "users" — users handled via /api/users
const COLLECTION_KEYS = DATA_KEYS.filter((k) => k !== "users");

// ════════════════════════════════════════════════════════════════════
//  APP SHELL
// ════════════════════════════════════════════════════════════════════
export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem("bc_auth");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("bc_token") || null);
  const [page, setPage] = useState("dashboard");
  const [tick, setTick] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(() => {
    const d = {};
    DATA_KEYS.forEach((k) => { d[k] = []; });
    return d;
  });
  const [settings, setSettings] = useState(DEF_SETTINGS);
  const [operators, setOperators] = useState([]);
  const loadingRef = useRef(false);

  // ── Tick timer (for live lesson timers) ──────────────────────────
  useEffect(() => {
    const iv = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // ── Load all data from server ────────────────────────────────────
  const loadAllData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const promises = COLLECTION_KEYS.map((k) =>
        loadCollection(k).then((items) => [k, items])
      );
      promises.push(loadSettings().then((s) => ["__settings__", s]));
      promises.push(loadUsers().then((u) => ["users", u]));
      promises.push(loadOperators().then((o) => ["__operators__", o]).catch(() => ["__operators__", []]));

      const results = await Promise.all(promises);

      const newData = {};
      DATA_KEYS.forEach((k) => { newData[k] = []; });

      for (const [k, v] of results) {
        if (k === "__settings__") {
          setSettings(v && Object.keys(v).length > 0 ? v : DEF_SETTINGS);
        } else if (k === "__operators__") {
          setOperators(v || []);
        } else {
          newData[k] = v || [];
        }
      }
      setData(newData);
    } catch (err) {
      console.error("[App] Failed to load data:", err);
      setError("Failed to connect to the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // ── Socket.IO event handler ──────────────────────────────────────
  const handleSocketEvent = useCallback((type, key, value) => {
    if (type === "collection") {
      setData((p) => ({ ...p, [key]: value }));
    } else if (type === "settings") {
      setSettings(value);
    } else if (type === "users") {
      setData((p) => ({ ...p, users: value }));
    } else if (type === "reload") {
      loadAllData();
    }
  }, [loadAllData]);

  // ── Initialize on token/auth change ──────────────────────────────
  useEffect(() => {
    if (token && auth) {
      setAuthToken(token);
      loadAllData();
      connectSocket(token, handleSocketEvent);
    }
    return () => {
      if (!token || !auth) disconnectSocket();
    };
  }, [token, auth, loadAllData, handleSocketEvent]);

  // ── Listen for auth:expired ──────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setAuth(null);
      setToken(null);
      localStorage.removeItem("bc_token");
      localStorage.removeItem("bc_auth");
      disconnectSocket();
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  // ── Login ────────────────────────────────────────────────────────
  const login = useCallback((user, jwt) => {
    setAuth(user);
    setToken(jwt);
    localStorage.setItem("bc_token", jwt);
    localStorage.setItem("bc_auth", JSON.stringify(user));
    setAuthToken(jwt);
    setPage("dashboard");
  }, []);

  // ── Logout ───────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setAuth(null);
    setToken(null);
    localStorage.removeItem("bc_token");
    localStorage.removeItem("bc_auth");
    setAuthToken(null);
    disconnectSocket();
    setPage("dashboard");
  }, []);

  // ── Update collection (optimistic + async save) ──────────────────
  const update = useCallback((k, v) => {
    setData((p) => ({ ...p, [k]: v }));
    if (k !== "users") {
      saveCollection(k, v).catch((err) =>
        console.error(`[App] Failed to save ${k}:`, err)
      );
    }
  }, []);

  // ── Update settings ──────────────────────────────────────────────
  const updateSettings = useCallback((s) => {
    setSettings(s);
    saveSettingsAPI(s).catch((err) =>
      console.error("[App] Failed to save settings:", err)
    );
  }, []);

  // ── Reset all (clears database via API) ──────────────────────────
  const resetAll = useCallback(async () => {
    if (!window.confirm("Reset ALL data? This will clear everything from the database and restore defaults.")) return;
    try {
      await resetAllAPI();
      localStorage.removeItem("bc_token");
      localStorage.removeItem("bc_auth");
      window.location.reload();
    } catch (err) {
      console.error("[App] Reset failed:", err);
      window.alert("Reset failed. Make sure you are logged in as admin.");
    }
  }, []);

  // ── Login gate ───────────────────────────────────────────────────
  if (!auth || !token) {
    return <LoginPage onLogin={login} />;
  }

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans',sans-serif",
        background: "linear-gradient(135deg,#f5f0e8 0%,#faf5e8 30%,#f8efc0 60%,#f0e8a0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🏄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.pri }}>Loading...</div>
        <div style={{ fontSize: 11, color: C.sec }}>Connecting to server</div>
      </div>
    );
  }

  // ── Connection error state ───────────────────────────────────────
  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans',sans-serif",
        background: "linear-gradient(135deg,#f5f0e8 0%,#faf5e8 30%,#f8efc0 60%,#f0e8a0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🏄</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>Connection Error</div>
        <div style={{
          fontSize: 12, color: C.sec, textAlign: "center",
          maxWidth: 400, lineHeight: 1.6, padding: "0 20px",
        }}>
          {error}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={S.btn(C.pri, "#fff")} onClick={() => { setError(null); loadAllData(); }}>
            Retry Connection
          </button>
          <button style={S.btnO()} onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  const Page = page === "dashboard" && auth?.role === "admin" ? AdminDashboardPage : (PG[page] || DashboardPage);

  return (
    <Ctx.Provider value={{ data, update, settings, updateSettings, resetAll, tick, auth, logout, operators, setOperators }}>
      <PinVerifyProvider>
      <div
        className="app-shell"
        style={{
          minHeight: "100vh",
          fontFamily: "'DM Sans',sans-serif",
          background: "linear-gradient(135deg,#f5f0e8 0%,#faf5e8 30%,#f8efc0 60%,#f0e8a0 100%)",
          padding: "20px 24px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 260,
            width: 280,
            height: 180,
            pointerEvents: "none",
            zIndex: 0,
            background: "repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(0,0,0,.04) 4px,rgba(0,0,0,.04) 5px)",
          }}
        />

        <Navbar page={page} setPage={setPage} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <Page />
        </div>
      </div>
      </PinVerifyProvider>
    </Ctx.Provider>
  );
}
