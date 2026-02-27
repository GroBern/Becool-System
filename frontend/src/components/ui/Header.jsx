import { C, S } from "../../styles";

export default function Header({ title, sub, onAdd, addLabel, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.5px", margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: C.sec, marginTop: 2 }}>{sub}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {children}
        {onAdd && (
          <button style={S.btn(C.pri, "#fff")} onClick={onAdd}>
            {addLabel || "+ Add"}
          </button>
        )}
      </div>
    </div>
  );
}
