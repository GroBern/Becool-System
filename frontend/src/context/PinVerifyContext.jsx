import { createContext, useContext, useState, useCallback } from "react";
import { useAppContext } from "./AppContext";
import { C, S } from "../styles";
import { verifyOperatorAPI, setCurrentOperator } from "../services/api";

const PinCtx = createContext();

export const usePinVerify = () => useContext(PinCtx);

export function PinVerifyProvider({ children }) {
  const { auth } = useAppContext();
  const [pending, setPending] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [operatorName, setOperatorName] = useState("");

  const verifyPin = useCallback(
    (callback) => {
      // Admin skips PIN — pass admin as operator
      if (auth?.role === "admin") {
        const adminOp = { id: auth.id, name: auth.name };
        setCurrentOperator(adminOp);
        callback(adminOp);
        return;
      }
      setPending(() => callback);
      setPin("");
      setError("");
      setOperatorName("");
    },
    [auth]
  );

  const handleConfirm = async () => {
    if (!pin) { setError("Please enter your PIN"); return; }
    if (checking) return;
    setChecking(true);
    try {
      const { operator } = await verifyOperatorAPI(pin);
      setCurrentOperator(operator);
      const cb = pending;
      setPending(null);
      setPin("");
      setError("");
      setOperatorName("");
      cb(operator);
    } catch {
      setError("Incorrect PIN");
      setOperatorName("");
    } finally {
      setChecking(false);
    }
  };

  const handlePinChange = async (val) => {
    const clean = val.replace(/\D/g, "");
    setPin(clean);
    setError("");
    setOperatorName("");
  };

  const handleCancel = () => {
    setPending(null);
    setPin("");
    setError("");
    setOperatorName("");
  };

  return (
    <PinCtx.Provider value={{ verifyPin }}>
      {children}
      {pending && (
        <div style={S.overlay} onClick={handleCancel}>
          <div style={{ ...S.modal, maxWidth: 360, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.pri, marginBottom: 4 }}>
              Enter Your PIN
            </div>
            <p style={{ fontSize: 12, color: C.sec, marginBottom: 16 }}>
              Identify yourself to continue
            </p>

            <input
              style={{ ...S.inp, textAlign: "center", letterSpacing: 8, fontSize: 20, fontWeight: 700 }}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="••••"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            />

            {operatorName && (
              <div style={{
                background: "rgba(107,201,107,.1)", color: C.grn, fontSize: 12,
                fontWeight: 600, padding: "7px 12px", borderRadius: 8, marginBottom: 8,
              }}>
                {operatorName}
              </div>
            )}

            {error && (
              <div style={{
                background: "rgba(232,90,90,.1)", color: C.red, fontSize: 11.5,
                fontWeight: 500, padding: "7px 12px", borderRadius: 8, marginBottom: 8,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
              <button style={S.btn("transparent", C.sec)} onClick={handleCancel}>Cancel</button>
              <button style={S.btn(C.pri, "#fff")} onClick={handleConfirm}>
                {checking ? "Verifying..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PinCtx.Provider>
  );
}
