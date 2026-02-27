import { useState, useMemo } from "react";
import { useAppContext, usePinVerify } from "../../context";
import { C, S } from "../../styles";
import { genId, today, fmtDate, fmt$ } from "../../utils";
import { Modal, DeleteGuard, Empty, Header, Filter } from "../../components/ui";

const CATEGORIES = [
  "food & drinks",
  "transport",
  "equipment",
  "maintenance",
  "utilities",
  "staff",
  "supplies",
  "marketing",
  "rent",
  "other",
];

const CAT_COLORS = {
  "food & drinks": { bg: C.ornB, col: C.orn },
  transport: { bg: C.bluB, col: C.blu },
  equipment: { bg: C.purB, col: C.pur },
  maintenance: { bg: C.grnB, col: C.grn },
  utilities: { bg: "rgba(90,155,213,.12)", col: "#4a8bc5" },
  staff: { bg: "rgba(155,123,212,.12)", col: "#8a6bc4" },
  supplies: { bg: "rgba(232,148,90,.12)", col: "#c87a40" },
  marketing: { bg: "rgba(107,201,107,.12)", col: "#5ab95a" },
  rent: { bg: "rgba(232,90,90,.12)", col: C.red },
  other: { bg: "rgba(122,122,122,.12)", col: C.sec },
};

export default function ExpensesPage() {
  const { data, update } = useAppContext();
  const { verifyPin } = usePinVerify();
  const [open, setOpen] = useState(false);
  const [f, sf] = useState({});
  const [del, setDel] = useState(null);
  const [catFilter, setCatFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const expenses = data.dailyExpenses || [];

  // filter
  const filtered = useMemo(() => {
    let list = [...expenses];
    if (catFilter) list = list.filter((e) => e.category === catFilter);
    const now = new Date();
    if (dateFilter === "today") {
      const t = today();
      list = list.filter((e) => e.date === t);
    } else if (dateFilter === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      list = list.filter((e) => new Date(e.date) >= d);
    } else if (dateFilter === "month") {
      list = list.filter(
        (e) =>
          new Date(e.date).getMonth() === now.getMonth() &&
          new Date(e.date).getFullYear() === now.getFullYear()
      );
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return list;
  }, [expenses, catFilter, dateFilter]);

  // stats
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const todayTotal = expenses
    .filter((e) => e.date === today())
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const thisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  // category breakdown
  const catBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const openAdd = () => {
    sf({ date: today(), category: "food & drinks", amount: "", description: "", notes: "" });
    setOpen(true);
  };

  const openEdit = (exp) => {
    sf({ ...exp, editing: true });
    setOpen(true);
  };

  const doSave = (op) => {
    if (!f.amount || !f.description) return;
    if (f.editing) {
      update(
        "dailyExpenses",
        expenses.map((e) =>
          e.id === f.id ? { id: f.id, date: f.date, category: f.category, amount: f.amount, description: f.description, notes: f.notes, operatorName: op.name, operatorId: op.id } : e
        )
      );
    } else {
      update("dailyExpenses", [...expenses, { ...f, id: genId(), operatorName: op.name, operatorId: op.id }]);
    }
    setOpen(false);
  };

  const doDelete = () => {
    update("dailyExpenses", expenses.filter((e) => e.id !== del));
    setDel(null);
  };

  return (
    <div>
      <Header title="Daily Expenses" sub="Track all daily business expenses" onAdd={openAdd} addLabel="+ Add Expense">
        <Filter
          v={catFilter}
          set={setCatFilter}
          ph="All Categories"
          opts={CATEGORIES.map((c) => ({ v: c, l: c.charAt(0).toUpperCase() + c.slice(1) }))}
        />
        <Filter
          v={dateFilter}
          set={setDateFilter}
          ph="All Time"
          opts={[
            { v: "today", l: "Today" },
            { v: "week", l: "This Week" },
            { v: "month", l: "This Month" },
          ]}
        />
      </Header>

      {/* stats row */}
      <div className="expense-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>Today</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.orn }}>{fmt$(todayTotal)}</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>This Month</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.blu }}>{fmt$(thisMonth)}</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>All Time</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.pri }}>{fmt$(totalAll)}</div>
        </div>
      </div>

      {/* category breakdown bar */}
      {catBreakdown.length > 0 && (
        <div style={{ ...S.card, marginBottom: 14, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.sec, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".3px" }}>
            Category Breakdown
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {catBreakdown.map(([cat, amt]) => {
              const cc = CAT_COLORS[cat] || CAT_COLORS.other;
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ ...S.tag(cc.bg, cc.col), fontSize: 10.5 }}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.dk }}>{fmt$(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* expense list */}
      {filtered.length === 0 ? (
        <Empty />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((e) => {
            const cc = CAT_COLORS[e.category] || CAT_COLORS.other;
            return (
              <div
                key={e.id}
                className="lesson-card"
                style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{e.description}</span>
                    <span style={S.tag(cc.bg, cc.col)}>
                      {e.category.charAt(0).toUpperCase() + e.category.slice(1)}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: C.sec, marginTop: 2 }}>
                    {fmtDate(e.date)}
                    {e.notes ? ` · ${e.notes}` : ""}
                    {e.operatorName ? ` · by ${e.operatorName}` : ""}
                  </div>
                </div>
                <div className="lesson-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.orn, marginRight: 4 }}>
                    {fmt$(Number(e.amount || 0))}
                  </span>
                  <button style={S.btnO(C.blu)} onClick={() => openEdit(e)}>Edit</button>
                  <button style={S.btnO(C.red)} onClick={() => setDel(e.id)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* add/edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={f.editing ? "Edit Expense" : "Add Daily Expense"}>
        <label style={S.label}>Description *</label>
        <input
          style={S.inp}
          placeholder="e.g. Lunch for staff, Fuel, Board wax..."
          value={f.description || ""}
          onChange={(e) => sf({ ...f, description: e.target.value })}
        />
        <div className="grid3-form" style={S.grid3}>
          <div>
            <label style={S.label}>Amount (LKR) *</label>
            <input
              style={S.inp}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={f.amount || ""}
              onChange={(e) => sf({ ...f, amount: e.target.value })}
            />
          </div>
          <div>
            <label style={S.label}>Date</label>
            <input
              style={S.inp}
              type="date"
              value={f.date || ""}
              onChange={(e) => sf({ ...f, date: e.target.value })}
            />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select
              style={S.sel}
              value={f.category || ""}
              onChange={(e) => sf({ ...f, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label style={S.label}>Notes</label>
        <input
          style={S.inp}
          placeholder="Optional notes..."
          value={f.notes || ""}
          onChange={(e) => sf({ ...f, notes: e.target.value })}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setOpen(false)}>Cancel</button>
          <button
            style={{
              ...S.btn(f.amount && f.description ? C.pri : C.mut, "#fff"),
              cursor: f.amount && f.description ? "pointer" : "not-allowed",
            }}
            onClick={() => verifyPin((op) => doSave(op))}
          >
            {f.editing ? "Update" : "Save"}
          </button>
        </div>
      </Modal>

      <DeleteGuard open={!!del} onYes={doDelete} onNo={() => setDel(null)} itemDesc={`Expense: ${(expenses.find((e) => e.id === del) || {}).description || "item"}`} dataKey="dailyExpenses" itemId={del} />
    </div>
  );
}
