import { C, S } from "../../styles";

export default function Confirm({ open, onYes, onNo, msg }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={onNo}>
      <div style={{ ...S.modal, maxWidth: 360, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 13.5, marginBottom: 18, color: C.pri }}>{msg || "Are you sure?"}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button style={S.btn("transparent", C.sec)} onClick={onNo}>Cancel</button>
          <button style={S.btn(C.red, "#fff")} onClick={onYes}>Delete</button>
        </div>
      </div>
    </div>
  );
}
