import { useState } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { fmt$, fmtDate } from "../../utils";
import { DeleteGuard, Tag, Empty, Header, Search, Filter } from "../../components/ui";

export default function PaymentsPage() {
  const { data, update, settings } = useAppContext();
  const [search, setSearch] = useState("");
  const [fm, setFm] = useState("");
  const [fs, setFs] = useState("");
  const [del, setDel] = useState(null);

  const payments = (data.payments || []).filter(
    (p) => (!search || (p.customerName || "").toLowerCase().includes(search.toLowerCase())) && (!fm || p.method === fm) && (!fs || p.status === fs)
  );
  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const doDelete = () => { update("payments", (data.payments || []).filter((p) => p.id !== del)); setDel(null); };

  return (
    <div>
      <Header title="Payments" sub="All payment transactions">
        <Search v={search} set={setSearch} ph="Search customer..." />
        <Filter v={fm} set={setFm} ph="All Methods" opts={[{ v: "cash", l: "Cash" }, { v: "card", l: "Card" }, { v: "online", l: "Online" }]} />
        <Filter v={fs} set={setFs} ph="All Status" opts={[{ v: "pending", l: "Pending" }, { v: "completed", l: "Completed" }]} />
      </Header>
      <div style={{ ...S.card, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.sec }}>Showing {payments.length} payments</span>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Total: {fmt$(total, settings)}</span>
      </div>
      {payments.length === 0 ? <Empty msg="No payments" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {payments.map((p) => (
            <div key={p.id} className="lesson-card" style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.customerName || "—"} — {fmt$(p.amount, settings)}</div>
                <div style={{ fontSize: 10.5, color: C.sec }}>{fmtDate(p.date)} · {p.type} {p.notes ? `· ${p.notes}` : ""}</div>
              </div>
              <div style={S.row}><Tag status={p.method} /><Tag status={p.status} /><button style={S.btnO(C.red)} onClick={() => setDel(p.id)}>✕</button></div>
            </div>
          ))}
        </div>
      )}
      <DeleteGuard open={!!del} onYes={doDelete} onNo={() => setDel(null)} itemDesc={`Payment: ${((data.payments || []).find((p) => p.id === del) || {}).customerName || "payment"} — ${fmt$(((data.payments || []).find((p) => p.id === del) || {}).amount || 0, settings)}`} dataKey="payments" itemId={del} />
    </div>
  );
}
