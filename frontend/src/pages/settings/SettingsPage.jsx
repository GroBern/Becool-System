import { useState } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { today } from "../../utils";
import { Header, Modal, Confirm } from "../../components/ui";
import {
  exportBackupAPI,
  importBackupAPI,
  createUserAPI,
  updateUserAPI,
  deleteUserAPI,
  createOperatorAPI,
  updateOperatorAPI,
  deleteOperatorAPI,
} from "../../services/api";

export default function SettingsPage() {
  const { settings, updateSettings, resetAll, data, update, operators, setOperators } = useAppContext();
  const [s, setS] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  // ── User management state ────────────────────────────────────
  const users = data.users || [];
  const [userModal, setUserModal] = useState(false);
  const [uf, setUf] = useState({});
  const [userError, setUserError] = useState("");
  const [delUser, setDelUser] = useState(null);

  const sv = () => { updateSettings(s); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const exp = async () => {
    try {
      const d = await exportBackupAPI();
      const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u; a.download = `becool-backup-${today()}.json`; a.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const imp = () => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = ".json";
    i.onchange = (e) => {
      const r = new FileReader();
      r.onload = async (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          await importBackupAPI(d);
          window.location.reload();
        } catch (err) {
          console.error("Import failed:", err);
        }
      };
      r.readAsText(e.target.files[0]);
    };
    i.click();
  };

  // ── User CRUD ────────────────────────────────────────────────
  const openAddUser = () => {
    setUf({ name: "", username: "", password: "", pin: "", role: "cashier" });
    setUserError("");
    setUserModal(true);
  };
  const openEditUser = (u) => {
    setUf({ ...u, editing: true });
    setUserError("");
    setUserModal(true);
  };
  const parseError = (err) => {
    try { return JSON.parse(err.message).error; } catch { return err.message || "Something went wrong"; }
  };
  const saveUser = async () => {
    if (!uf.name) { setUserError("Full name is required"); return; }
    if (!uf.username) { setUserError("Username is required"); return; }
    if (!uf.editing && !uf.password) { setUserError("Password is required"); return; }
    setUserError("");
    try {
      if (uf.editing) {
        const body = { username: uf.username, name: uf.name, role: uf.role };
        if (uf.password) body.password = uf.password;
        if (uf.pin !== undefined) body.pin = uf.pin;
        const { users: updated } = await updateUserAPI(uf.id, body);
        update("users", updated);
      } else {
        const { users: updated } = await createUserAPI({ username: uf.username, password: uf.password, pin: uf.pin || "", name: uf.name, role: uf.role });
        update("users", updated);
      }
      setUserModal(false);
    } catch (err) {
      setUserError(parseError(err));
    }
  };
  const doDeleteUser = async () => {
    try {
      const { users: updated } = await deleteUserAPI(delUser);
      update("users", updated);
      setDelUser(null);
    } catch (err) {
      window.alert(err.message?.includes("last admin") ? "Cannot delete the last admin account." : "Delete failed");
      setDelUser(null);
    }
  };

  // ── Operator management state ────────────────────────────────
  const [opModal, setOpModal] = useState(false);
  const [opf, setOpf] = useState({});
  const [opError, setOpError] = useState("");
  const [delOp, setDelOp] = useState(null);

  const openAddOp = () => { setOpf({ name: "", pin: "" }); setOpError(""); setOpModal(true); };
  const openEditOp = (op) => { setOpf({ ...op, editing: true, pin: "" }); setOpError(""); setOpModal(true); };
  const parseOpError = (err) => {
    try { return JSON.parse(err.message).error; } catch { return err.message || "Something went wrong"; }
  };
  const saveOp = async () => {
    if (!opf.name) { setOpError("Name is required"); return; }
    if (!opf.editing && !opf.pin) { setOpError("PIN is required"); return; }
    if (opf.pin && opf.pin.length < 4) { setOpError("PIN must be at least 4 digits"); return; }
    setOpError("");
    try {
      if (opf.editing) {
        const body = { name: opf.name };
        if (opf.pin) body.pin = opf.pin;
        const { operators: updated } = await updateOperatorAPI(opf.id, body);
        setOperators(updated);
      } else {
        const { operators: updated } = await createOperatorAPI({ name: opf.name, pin: opf.pin });
        setOperators(updated);
      }
      setOpModal(false);
    } catch (err) {
      setOpError(parseOpError(err));
    }
  };
  const doDeleteOp = async () => {
    try {
      const { operators: updated } = await deleteOperatorAPI(delOp);
      setOperators(updated);
      setDelOp(null);
    } catch (err) {
      window.alert("Delete failed");
      setDelOp(null);
    }
  };

  const sp = s.singlePrices || {};
  const gp = s.groupPrices || {};

  return (
    <div>
      <Header title="Settings" sub="Configuration & data management" />
      <div className="settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Business</div>
          <label style={S.label}>Name</label><input style={S.inp} value={s.businessName || ""} onChange={(e) => setS({ ...s, businessName: e.target.value })} />
          <label style={S.label}>Location</label><input style={S.inp} value={s.location || ""} onChange={(e) => setS({ ...s, location: e.target.value })} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Single Prices</div>
          {["beginner", "intermediate", "advanced"].map((l) => (
            <div key={l}><label style={S.label}>{l} (LKR)</label><input style={S.inp} type="number" value={sp[l] || ""} onChange={(e) => setS({ ...s, singlePrices: { ...sp, [l]: Number(e.target.value) } })} /></div>
          ))}
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Group Prices</div>
          {["beginner", "intermediate", "advanced"].map((l) => (
            <div key={l}><label style={S.label}>{l} (LKR)</label><input style={S.inp} type="number" value={gp[l] || ""} onChange={(e) => setS({ ...s, groupPrices: { ...gp, [l]: Number(e.target.value) } })} /></div>
          ))}
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Rentals</div>
          <label style={S.label}>Surfboard Hourly</label><input style={S.inp} type="number" value={s.surfboardRental?.hourly || ""} onChange={(e) => setS({ ...s, surfboardRental: { ...s.surfboardRental, hourly: Number(e.target.value) } })} />
          <label style={S.label}>Surfboard Daily</label><input style={S.inp} type="number" value={s.surfboardRental?.daily || ""} onChange={(e) => setS({ ...s, surfboardRental: { ...s.surfboardRental, daily: Number(e.target.value) } })} />
          <label style={S.label}>Sunbed Hourly</label><input style={S.inp} type="number" value={s.sunbedRental?.hourly || ""} onChange={(e) => setS({ ...s, sunbedRental: { ...s.sunbedRental, hourly: Number(e.target.value) } })} />
          <label style={S.label}>Sunbed Daily</label><input style={S.inp} type="number" value={s.sunbedRental?.daily || ""} onChange={(e) => setS({ ...s, sunbedRental: { ...s.sunbedRental, daily: Number(e.target.value) } })} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button style={S.btn(C.pri, "#fff")} onClick={sv}>{saved ? "✓ Saved!" : "Save Settings"}</button>
        <button style={S.btnO()} onClick={exp}>Export</button>
        <button style={S.btnO()} onClick={imp}>Import</button>
        <button style={S.btn(C.red, "#fff")} onClick={resetAll}>Reset All</button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          USER ACCOUNTS MANAGEMENT
      ════════════════════════════════════════════════════════════ */}
      <div style={{ ...S.section, marginTop: 24, paddingTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>User Accounts</div>
            <div style={{ fontSize: 11.5, color: C.sec }}>Manage admin and cashier logins</div>
          </div>
          <button style={S.btn(C.pri, "#fff")} onClick={openAddUser}>+ Add User</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((u) => (
            <div key={u.id} className="lesson-card" style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: u.role === "admin" ? C.yelL : C.bluB,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700,
                  color: u.role === "admin" ? C.yelD : C.blu,
                }}>
                  {u.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 10.5, color: C.sec }}>
                    @{u.username} ·{" "}
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, textTransform: "uppercase",
                      padding: "1px 6px", borderRadius: 4,
                      background: u.role === "admin" ? C.yelL : C.bluB,
                      color: u.role === "admin" ? C.yelD : C.blu,
                    }}>
                      {u.role}
                    </span>
                    {" · "}
                    <span style={{
                      fontSize: 9.5, fontWeight: 500,
                      color: u.hasPin ? C.grn : C.mut,
                    }}>
                      {u.hasPin ? "PIN set" : "No PIN"}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={S.btnO()} onClick={() => openEditUser(u)}>Edit</button>
                <button style={S.btnO(C.red)} onClick={() => setDelUser(u.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title={uf.editing ? "Edit User" : "Add User"}>
        <label style={S.label}>Full Name *</label>
        <input style={S.inp} value={uf.name || ""} onChange={(e) => setUf({ ...uf, name: e.target.value })} placeholder="e.g. John Doe" />
        <div style={S.grid2}>
          <div>
            <label style={S.label}>Username *</label>
            <input style={S.inp} value={uf.username || ""} onChange={(e) => setUf({ ...uf, username: e.target.value })} placeholder="e.g. john" />
          </div>
          <div>
            <label style={S.label}>{uf.editing ? "New Password (leave blank to keep)" : "Password *"}</label>
            <input style={S.inp} type="password" value={uf.password || ""} onChange={(e) => setUf({ ...uf, password: e.target.value })} placeholder={uf.editing ? "••••••" : "Enter password"} />
          </div>
        </div>
        <div style={S.grid2}>
          <div>
            <label style={S.label}>Role</label>
            <select style={S.sel} value={uf.role || "cashier"} onChange={(e) => setUf({ ...uf, role: e.target.value })}>
              <option value="admin">Admin — Full access</option>
              <option value="cashier">Cashier — Operational access</option>
            </select>
          </div>
          <div>
            <label style={S.label}>{uf.editing ? "PIN (leave blank to keep)" : "PIN Number"}</label>
            <input style={S.inp} type="text" inputMode="numeric" maxLength={6} value={uf.pin || ""} onChange={(e) => setUf({ ...uf, pin: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 1234" />
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: C.mut, marginTop: -4, marginBottom: 8 }}>
          PIN is used for quick action verification (e.g. saving lessons, confirming payments)
        </div>
        {userError && (
          <div style={{
            background: "rgba(232,90,90,.1)", color: C.red, fontSize: 12,
            fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 8,
          }}>
            {userError}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setUserModal(false)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={saveUser}>{uf.editing ? "Update" : "Create User"}</button>
        </div>
      </Modal>
      <Confirm open={!!delUser} onYes={doDeleteUser} onNo={() => setDelUser(null)} msg="Delete this user account?" />

      {/* ════════════════════════════════════════════════════════════
          OPERATORS MANAGEMENT
      ════════════════════════════════════════════════════════════ */}
      <div style={{ ...S.section, marginTop: 24, paddingTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Operators</div>
            <div style={{ fontSize: 11.5, color: C.sec }}>Staff members identified by PIN when performing actions</div>
          </div>
          <button style={S.btn(C.pri, "#fff")} onClick={openAddOp}>+ Add Operator</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(operators || []).map((op) => (
            <div key={op.id} className="lesson-card" style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: C.grnB,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: C.grn,
                }}>
                  {op.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{op.name}</div>
                  <div style={{ fontSize: 10.5, color: C.sec }}>
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, textTransform: "uppercase",
                      padding: "1px 6px", borderRadius: 4,
                      background: op.active ? C.grnB : "rgba(122,122,122,.12)",
                      color: op.active ? C.grn : C.sec,
                    }}>
                      {op.active ? "Active" : "Inactive"}
                    </span>
                    {" · PIN set"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={S.btnO()} onClick={() => openEditOp(op)}>Edit</button>
                <button style={S.btnO(C.red)} onClick={() => setDelOp(op.id)}>✕</button>
              </div>
            </div>
          ))}
          {(!operators || operators.length === 0) && (
            <div style={{ textAlign: "center", padding: 20, color: C.sec, fontSize: 12 }}>
              No operators yet. Add operators so staff can identify themselves by PIN.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Operator Modal */}
      <Modal open={opModal} onClose={() => setOpModal(false)} title={opf.editing ? "Edit Operator" : "Add Operator"}>
        <label style={S.label}>Operator Name *</label>
        <input style={S.inp} value={opf.name || ""} onChange={(e) => setOpf({ ...opf, name: e.target.value })} placeholder="e.g. John" />
        <label style={S.label}>{opf.editing ? "New PIN (leave blank to keep)" : "PIN * (min 4 digits)"}</label>
        <input
          style={{ ...S.inp, letterSpacing: 6, fontWeight: 600 }}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={opf.pin || ""}
          onChange={(e) => setOpf({ ...opf, pin: e.target.value.replace(/\D/g, "") })}
          placeholder={opf.editing ? "••••" : "Enter PIN"}
        />
        <div style={{ fontSize: 10.5, color: C.mut, marginTop: -4, marginBottom: 8 }}>
          Operators enter this PIN to identify themselves when performing actions (saving lessons, collecting payments, etc.)
        </div>
        {opError && (
          <div style={{
            background: "rgba(232,90,90,.1)", color: C.red, fontSize: 12,
            fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginBottom: 8,
          }}>
            {opError}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setOpModal(false)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={saveOp}>{opf.editing ? "Update" : "Create Operator"}</button>
        </div>
      </Modal>
      <Confirm open={!!delOp} onYes={doDeleteOp} onNo={() => setDelOp(null)} msg="Delete this operator?" />
    </div>
  );
}
