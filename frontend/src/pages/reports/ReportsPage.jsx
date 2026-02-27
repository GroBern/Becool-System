import { useState } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { today, fmt$ } from "../../utils";
import { Header } from "../../components/ui";

export default function ReportsPage() {
  const { data, settings } = useAppContext();
  const [rd, setRd] = useState(today());
  const pay = (data.payments || []).filter((p) => p.date === rd && p.status === "completed");
  const rev = pay.reduce((s, p) => s + Number(p.amount || 0), 0);
  const adv = (data.instructorAdvances || []).filter((a) => a.date === rd).reduce((s, a) => s + Number(a.amount || 0), 0);
  const exp = (data.instructorExpenses || []).filter((e) => e.date === rd).reduce((s, e) => s + Number(e.amount || 0), 0);
  const net = rev - adv - exp;
  const sc = (data.singleLessons || []).filter((l) => l.date === rd).length;
  const gc = (data.groupLessons || []).filter((l) => l.date === rd).length;
  const byM = { cash: 0, card: 0, online: 0 };
  pay.forEach((p) => { byM[p.method] = (byM[p.method] || 0) + Number(p.amount || 0); });

  return (
    <div>
      <Header title="Reports" sub="Financial & operational reporting">
        <input type="date" style={{ ...S.inp, marginBottom: 0, maxWidth: 170 }} value={rd} onChange={(e) => setRd(e.target.value)} />
      </Header>
      <div className="report-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Lessons</div><div style={{ fontSize: 26, fontWeight: 700 }}>{sc + gc}</div><div style={{ fontSize: 10, color: C.mut }}>{sc} single · {gc} group</div></div>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Revenue</div><div style={{ fontSize: 26, fontWeight: 700, color: C.grn }}>{fmt$(rev, settings)}</div></div>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Advances</div><div style={{ fontSize: 26, fontWeight: 700, color: C.orn }}>{fmt$(adv, settings)}</div></div>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Expenses</div><div style={{ fontSize: 26, fontWeight: 700, color: C.orn }}>{fmt$(exp, settings)}</div></div>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Net Income</div><div style={{ fontSize: 26, fontWeight: 700, color: net >= 0 ? C.grn : C.red }}>{fmt$(net, settings)}</div></div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Payment Breakdown</div>
        <div className="payment-breakdown" style={{ display: "flex", gap: 16 }}>
          {Object.entries(byM).map(([m, v]) => (
            <div key={m} style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: C.sec, textTransform: "capitalize" }}>{m}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt$(v, settings)}</div>
              <div style={{ background: C.bdr, borderRadius: 3, height: 5, marginTop: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: m === "cash" ? C.grn : m === "card" ? C.blu : C.pur, width: rev ? `${(v / rev) * 100}%` : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
