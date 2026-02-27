import { C, S } from "../../styles";

export default function Modal({ open, onClose, title, wide, children }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={onClose}>
      <div
        className={wide ? "modal-box modal-wide" : "modal-box"}
        style={{ ...S.modal, ...(wide ? { maxWidth: 680 } : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.4px", margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.mut, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
