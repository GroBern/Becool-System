import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { fmt$ } from "../../utils";

export default function PaymentSection({ form, setForm, totalAmount, label }) {
  const { settings } = useAppContext();
  const showPartial = form.paymentStatus === "partial";
  return (
    <div style={S.section}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.yelD} strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.pri }}>{label || "Payment"}</span>
        {totalAmount != null && (
          <span style={{ fontSize: 12, color: C.sec, marginLeft: "auto" }}>
            Total: <b style={{ color: C.pri }}>{fmt$(totalAmount, settings)}</b>
          </span>
        )}
      </div>
      <div className="grid3-form" style={S.grid3}>
        <div>
          <label style={S.label}>Status</label>
          <select
            style={S.sel}
            value={form.paymentStatus || "pending"}
            onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
          >
            <option value="pending">⏳ Pending</option>
            <option value="partial">◐ Partial</option>
            <option value="paid">✓ Paid</option>
          </select>
        </div>
        <div>
          <label style={S.label}>Method</label>
          <select
            style={S.sel}
            value={form.paymentMethod || ""}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          >
            <option value="">Not set</option>
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="online">🌐 Online</option>
          </select>
        </div>
        <div>
          <label style={S.label}>{showPartial ? "Amount Paid" : "Amount"}</label>
          <input
            style={S.inp}
            type="number"
            step="0.01"
            value={form.paidAmount ?? (form.paymentStatus === "paid" ? totalAmount || "" : "")}
            onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
            placeholder={totalAmount != null ? String(totalAmount) : "0"}
          />
        </div>
      </div>
      {showPartial && (
        <div style={{ fontSize: 11, color: C.orn, marginTop: -4, marginBottom: 6 }}>
          Remaining: {fmt$(Math.max(0, Number(totalAmount || 0) - Number(form.paidAmount || 0)), settings)}
        </div>
      )}
    </div>
  );
}
