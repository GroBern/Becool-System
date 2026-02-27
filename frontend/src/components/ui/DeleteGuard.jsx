import { useState } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { genId, today } from "../../utils";
import { verifyOperatorAPI } from "../../services/api";

/**
 * DeleteGuard — replaces Confirm for delete actions.
 *  • Admin  → immediate delete (classic confirm dialog)
 *  • Cashier → request form (reason + password) → saved for admin approval
 *
 * Props:
 *   open        – boolean (is the dialog visible?)
 *   onYes       – fn() called when admin confirms immediate delete
 *   onNo        – fn() called to close / cancel
 *   itemDesc    – string describing what's being deleted (e.g. "Student: John")
 *   dataKey     – string, the localStorage data key (e.g. "singleLessons")
 *   itemId      – string, id of the item to delete
 *   msg         – optional custom message
 */
export default function DeleteGuard({ open, onYes, onNo, itemDesc, dataKey, itemId, msg }) {
  const { auth, data, update } = useAppContext();
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const isAdmin = auth?.role === "admin";

  const resetForm = () => {
    setReason("");
    setPin("");
    setError("");
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onNo();
  };

  // Admin — direct delete
  if (isAdmin) {
    return (
      <div style={S.overlay} onClick={handleClose}>
        <div style={{ ...S.modal, maxWidth: 360, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
          <p style={{ fontSize: 13.5, marginBottom: 18, color: C.pri }}>{msg || "Are you sure?"}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button style={S.btn("transparent", C.sec)} onClick={handleClose}>Cancel</button>
            <button style={S.btn(C.red, "#fff")} onClick={() => { onYes(); resetForm(); }}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // Cashier — request form
  const handleSubmit = async () => {
    if (!reason.trim()) { setError("Please provide a reason"); return; }
    if (!pin) { setError("Please enter your PIN"); return; }

    let operator;
    try {
      const result = await verifyOperatorAPI(pin);
      operator = result.operator;
    } catch {
      setError("Incorrect PIN");
      return;
    }

    const request = {
      id: genId(),
      itemDesc: itemDesc || "Unknown item",
      dataKey: dataKey || "",
      itemId: itemId || "",
      reason: reason.trim(),
      requestedBy: operator?.name || auth.name,
      requestedById: operator?.id || auth.id,
      operatorName: operator?.name,
      operatorId: operator?.id,
      requestedAt: new Date().toISOString(),
      date: today(),
      status: "pending",
    };

    update("deleteRequests", [...(data.deleteRequests || []), request]);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={S.overlay} onClick={handleClose}>
        <div style={{ ...S.modal, maxWidth: 400, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.grn, marginBottom: 6 }}>Request Submitted</div>
          <p style={{ fontSize: 12, color: C.sec, marginBottom: 16 }}>
            Your delete request has been sent to the admin for approval.
          </p>
          <button style={S.btn(C.pri, "#fff")} onClick={handleClose}>OK</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.overlay} onClick={handleClose}>
      <div style={{ ...S.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "rgba(232,90,90,.1)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0,
          }}>🗑️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.pri }}>Delete Request</div>
            <div style={{ fontSize: 11, color: C.sec }}>This requires admin approval</div>
          </div>
        </div>

        {/* item description */}
        <div style={{
          background: "rgba(232,90,90,.06)", borderRadius: 10, padding: "10px 14px",
          marginBottom: 14, fontSize: 12.5, color: C.red, fontWeight: 500,
        }}>
          {itemDesc || msg || "Selected item"}
        </div>

        {/* reason */}
        <label style={S.label}>Reason for deletion *</label>
        <textarea
          style={{ ...S.inp, minHeight: 60, resize: "vertical" }}
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(""); }}
          placeholder="Why does this need to be deleted?"
        />

        {/* PIN verification */}
        <label style={S.label}>Your PIN *</label>
        <input
          style={{ ...S.inp, letterSpacing: 6, fontWeight: 600 }}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="Enter your PIN to confirm"
        />

        {/* error */}
        {error && (
          <div style={{
            background: "rgba(232,90,90,.1)", color: C.red, fontSize: 11.5,
            fontWeight: 500, padding: "7px 12px", borderRadius: 8, marginBottom: 8,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button style={S.btn("transparent", C.sec)} onClick={handleClose}>Cancel</button>
          <button style={S.btn(C.orn, "#fff")} onClick={handleSubmit}>Submit Request</button>
        </div>
      </div>
    </div>
  );
}
