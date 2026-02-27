import { useState } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { genId, today, fmt$, fmtDate } from "../../utils";
import { Modal, Confirm, Empty, Header, Filter } from "../../components/ui";

export default function FinancesPage() {
  const { data, update, settings } = useAppContext();
  const [tab, setTab] = useState("advances");
  const [fi, setFi] = useState("");
  const [open, setOpen] = useState(false);
  const [f, sf] = useState({});
  const [del, setDel] = useState(null);

  const adv = (data.instructorAdvances || []).filter((a) => !fi || a.instructorName === fi);
  const exp = (data.instructorExpenses || []).filter((e) => !fi || e.instructorName === fi);
  const tA = adv.reduce((s, a) => s + Number(a.amount || 0), 0);
  const tE = exp.reduce((s, e) => s + Number(e.amount || 0), 0);
  const bal = tA - tE;

  const openAdd = () => { sf({ type: tab === "advances" ? "advance" : "expense", date: today(), category: "food" }); setOpen(true); };
  const doSave = () => {
    const k = f.type === "advance" ? "instructorAdvances" : "instructorExpenses";
    update(k, [...(data[k] || []), { ...f, id: genId() }]);
    setOpen(false);
  };
  const doDelete = () => {
    update("instructorAdvances", (data.instructorAdvances || []).filter((a) => a.id !== del));
    update("instructorExpenses", (data.instructorExpenses || []).filter((e) => e.id !== del));
    setDel(null);
  };

  return (
    <div>
      <Header title="Instructor Finances" sub="Track advances & expenses" onAdd={openAdd} addLabel={`+ ${tab === "advances" ? "Advance" : "Expense"}`}>
        <Filter v={fi} set={setFi} ph="All Instructors" opts={(data.instructors || []).map((i) => ({ v: i.name, l: i.name }))} />
      </Header>
      <div className="finance-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Advances</div><div style={{ fontSize: 22, fontWeight: 700, color: C.grn }}>{fmt$(tA, settings)}</div></div>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Expenses</div><div style={{ fontSize: 22, fontWeight: 700, color: C.orn }}>{fmt$(tE, settings)}</div></div>
        <div style={{ ...S.card, textAlign: "center" }}><div style={{ fontSize: 10.5, color: C.sec }}>Balance</div><div style={{ fontSize: 22, fontWeight: 700, color: bal >= 0 ? C.grn : C.red }}>{fmt$(bal, settings)}</div></div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button style={tab === "advances" ? S.btn(C.pri, "#fff") : S.btnO()} onClick={() => setTab("advances")}>Advances</button>
        <button style={tab === "expenses" ? S.btn(C.pri, "#fff") : S.btnO()} onClick={() => setTab("expenses")}>Expenses</button>
      </div>
      {(tab === "advances" ? adv : exp).length === 0 ? <Empty /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(tab === "advances" ? adv : exp).map((i) => (
            <div key={i.id} className="lesson-card" style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{i.instructorName} — {fmt$(i.amount, settings)}</div>
                <div style={{ fontSize: 10.5, color: C.sec }}>{fmtDate(i.date)} {i.category ? `· ${i.category}` : ""} {i.notes ? `· ${i.notes}` : ""}</div>
              </div>
              <button style={S.btnO(C.red)} onClick={() => setDel(i.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={f.type === "advance" ? "Add Advance" : "Add Expense"}>
        <label style={S.label}>Instructor</label>
        <select style={S.sel} value={f.instructorName || ""} onChange={(e) => sf({ ...f, instructorName: e.target.value })}>
          <option value="">Select</option>
          {(data.instructors || []).map((i) => <option key={i.id} value={i.name}>{i.name}</option>)}
        </select>
        <div style={S.grid2}>
          <div><label style={S.label}>Amount (LKR)</label><input style={S.inp} type="number" value={f.amount || ""} onChange={(e) => sf({ ...f, amount: e.target.value })} /></div>
          <div><label style={S.label}>Date</label><input style={S.inp} type="date" value={f.date || ""} onChange={(e) => sf({ ...f, date: e.target.value })} /></div>
        </div>
        {f.type === "expense" && (
          <>
            <label style={S.label}>Category</label>
            <select style={S.sel} value={f.category || ""} onChange={(e) => sf({ ...f, category: e.target.value })}>
              {["food", "transport", "equipment", "lesson-related", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
        <label style={S.label}>Notes</label><input style={S.inp} value={f.notes || ""} onChange={(e) => sf({ ...f, notes: e.target.value })} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setOpen(false)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={doSave}>Save</button>
        </div>
      </Modal>
      <Confirm open={!!del} onYes={doDelete} onNo={() => setDel(null)} />
    </div>
  );
}
