import { useState, useMemo } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { today, fmt$, fmtDate } from "../../utils";
import { Tag, Empty } from "../../components/ui";

// ════════════════════════════════════════════════════════════════════
//  DATE RANGE HELPERS
// ════════════════════════════════════════════════════════════════════
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
};
const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const MODES = [
  { k: "today", l: "Today" },
  { k: "yesterday", l: "Yesterday" },
  { k: "week", l: "This Week" },
  { k: "month", l: "This Month" },
  { k: "all", l: "All Time" },
  { k: "custom", l: "Custom Range" },
];

const TABS = [
  { k: "revenue", l: "Revenue & Payments" },
  { k: "history", l: "Payment History" },
  { k: "lessons", l: "Lessons" },
  { k: "rentals", l: "Rentals" },
  { k: "expenses", l: "Expenses" },
  { k: "people", l: "People" },
];

const CAT_COLORS = {
  "food & drinks": { bg: "rgba(232,148,90,.12)", col: "#c87a40" },
  transport: { bg: "rgba(90,155,213,.12)", col: "#4a8bc5" },
  equipment: { bg: "rgba(155,123,212,.12)", col: "#8a6bc4" },
  maintenance: { bg: "rgba(107,201,107,.12)", col: C.grn },
  utilities: { bg: "rgba(90,155,213,.12)", col: "#4a8bc5" },
  staff: { bg: "rgba(155,123,212,.12)", col: "#8a6bc4" },
  supplies: { bg: "rgba(232,148,90,.12)", col: "#c87a40" },
  marketing: { bg: "rgba(107,201,107,.12)", col: "#5ab95a" },
  rent: { bg: "rgba(232,90,90,.12)", col: C.red },
  other: { bg: "rgba(122,122,122,.12)", col: C.sec },
};

// ════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ════════════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
  const { data, settings } = useAppContext();
  const [mode, setMode] = useState("today");
  const [customStart, setCustomStart] = useState(today());
  const [customEnd, setCustomEnd] = useState(today());
  const [tab, setTab] = useState("revenue");

  // ── Compute effective date range ─────────────────────────────
  const [rangeStart, rangeEnd] = useMemo(() => {
    const t = today();
    switch (mode) {
      case "today": return [t, t];
      case "yesterday": { const y = yesterday(); return [y, y]; }
      case "week": return [weekStart(), t];
      case "month": return [monthStart(), t];
      case "all": return ["2000-01-01", "2099-12-31"];
      case "custom": return [customStart, customEnd];
      default: return [t, t];
    }
  }, [mode, customStart, customEnd]);

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    return dateStr >= rangeStart && dateStr <= rangeEnd;
  };

  // ── Filtered data ────────────────────────────────────────────
  const allPayments = useMemo(() => (data.payments || []).filter((p) => inRange(p.date)), [data.payments, rangeStart, rangeEnd]);
  const payments = useMemo(() => allPayments.filter((p) => p.status === "completed"), [allPayments]);
  const singleLessons = useMemo(() => (data.singleLessons || []).filter((l) => inRange(l.date)), [data.singleLessons, rangeStart, rangeEnd]);
  const groupLessons = useMemo(() => (data.groupLessons || []).filter((l) => inRange(l.date)), [data.groupLessons, rangeStart, rangeEnd]);
  const packageLessons = useMemo(() => (data.packageLessons || []).filter((p) => inRange(p.date || p.startDate)), [data.packageLessons, rangeStart, rangeEnd]);
  const dailyExpenses = useMemo(() => (data.dailyExpenses || []).filter((e) => inRange(e.date)), [data.dailyExpenses, rangeStart, rangeEnd]);
  const instrAdvances = useMemo(() => (data.instructorAdvances || []).filter((a) => inRange(a.date)), [data.instructorAdvances, rangeStart, rangeEnd]);
  const instrExpenses = useMemo(() => (data.instructorExpenses || []).filter((e) => inRange(e.date)), [data.instructorExpenses, rangeStart, rangeEnd]);
  const sunbedRentals = useMemo(() => (data.sunbedRentals || []).filter((r) => inRange(r.date || r.startTime?.slice(0, 10))), [data.sunbedRentals, rangeStart, rangeEnd]);
  const equipRentals = useMemo(() => (data.equipmentRentals || []).filter((r) => inRange(r.date || r.startTime?.slice(0, 10))), [data.equipmentRentals, rangeStart, rangeEnd]);

  // ── Summary stats ────────────────────────────────────────────
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalDailyExp = dailyExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalInstrCost = instrAdvances.reduce((s, a) => s + Number(a.amount || 0), 0) + instrExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalDailyExp - totalInstrCost;
  const totalLessons = singleLessons.length + groupLessons.length;
  const totalRentals = sunbedRentals.length + equipRentals.length;

  // ── Payment breakdown ────────────────────────────────────────
  const payByMethod = useMemo(() => {
    const m = { cash: 0, card: 0, online: 0 };
    payments.forEach((p) => { m[p.method] = (m[p.method] || 0) + Number(p.amount || 0); });
    return m;
  }, [payments]);

  // ── Payment by type ──────────────────────────────────────────
  const payByType = useMemo(() => {
    const m = {};
    payments.forEach((p) => { const t = p.type || "other"; m[t] = (m[t] || 0) + Number(p.amount || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [payments]);

  // ── Expense category breakdown ───────────────────────────────
  const expByCat = useMemo(() => {
    const m = {};
    dailyExpenses.forEach((e) => { m[e.category] = (m[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [dailyExpenses]);

  // ── Lesson status counts ─────────────────────────────────────
  const allLessons = [...singleLessons.map((l) => ({ ...l, _type: "single" })), ...groupLessons.map((l) => ({ ...l, _type: "group" }))];
  const lessonsByStatus = { scheduled: 0, "in-progress": 0, completed: 0, cancelled: 0 };
  allLessons.forEach((l) => { if (lessonsByStatus[l.status] !== undefined) lessonsByStatus[l.status]++; });

  // ── Range label ──────────────────────────────────────────────
  const rangeLabel = mode === "today" ? `Today — ${fmtDate(today())}` :
    mode === "yesterday" ? `Yesterday — ${fmtDate(yesterday())}` :
    mode === "week" ? `This Week — ${fmtDate(rangeStart)} to ${fmtDate(rangeEnd)}` :
    mode === "month" ? `This Month — ${fmtDate(rangeStart)} to ${fmtDate(rangeEnd)}` :
    mode === "all" ? "All Time" :
    `${fmtDate(customStart)} to ${fmtDate(customEnd)}`;

  return (
    <div>
      {/* ── Title ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-1px", marginBottom: 2 }}>Admin Dashboard</h1>
        <div style={{ fontSize: 12, color: C.sec }}>{rangeLabel}</div>
      </div>

      {/* ── Date Controls ──────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, alignItems: "center" }}>
        {MODES.map((m) => (
          <button
            key={m.k}
            style={mode === m.k ? S.btn(C.yel, C.pri) : S.btnO()}
            onClick={() => setMode(m.k)}
          >
            {m.l}
          </button>
        ))}
        {mode === "custom" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 4 }}>
            <input type="date" style={{ ...S.inp, marginBottom: 0, maxWidth: 150, padding: "6px 10px", fontSize: 12 }} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span style={{ fontSize: 11, color: C.sec }}>to</span>
            <input type="date" style={{ ...S.inp, marginBottom: 0, maxWidth: 150, padding: "6px 10px", fontSize: 12 }} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      {/* ── Summary Stats ──────────────────────────────────────── */}
      <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 18 }}>
        {[
          ["Revenue", fmt$(totalRevenue, settings), C.grn],
          ["Expenses", fmt$(totalDailyExp, settings), C.orn],
          ["Instructor Costs", fmt$(totalInstrCost, settings), C.orn],
          ["Net Profit", fmt$(netProfit, settings), netProfit >= 0 ? C.grn : C.red],
          ["Lessons", totalLessons, C.blu],
          ["Rentals", totalRentals, C.pur],
        ].map(([label, val, col]) => (
          <div key={label} style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: col, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.k} style={tab === t.k ? S.btn(C.pri, "#fff") : S.btnO()} onClick={() => setTab(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      {tab === "revenue" && <RevenueTab payments={payments} payByMethod={payByMethod} payByType={payByType} totalRevenue={totalRevenue} settings={settings} />}
      {tab === "history" && <PaymentHistoryTab allPayments={allPayments} data={data} singleLessons={singleLessons} groupLessons={groupLessons} sunbedRentals={sunbedRentals} equipRentals={equipRentals} settings={settings} />}
      {tab === "lessons" && <LessonsTab allLessons={allLessons} singleLessons={singleLessons} groupLessons={groupLessons} packageLessons={packageLessons} lessonsByStatus={lessonsByStatus} settings={settings} />}
      {tab === "rentals" && <RentalsTab sunbedRentals={sunbedRentals} equipRentals={equipRentals} settings={settings} />}
      {tab === "expenses" && <ExpensesTab dailyExpenses={dailyExpenses} expByCat={expByCat} totalDailyExp={totalDailyExp} instrAdvances={instrAdvances} instrExpenses={instrExpenses} totalInstrCost={totalInstrCost} settings={settings} />}
      {tab === "people" && <PeopleTab data={data} singleLessons={singleLessons} groupLessons={groupLessons} instrAdvances={instrAdvances} settings={settings} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TAB: Revenue & Payments
// ════════════════════════════════════════════════════════════════════
function RevenueTab({ payments, payByMethod, payByType, totalRevenue, settings }) {
  const mx = Math.max(payByMethod.cash, payByMethod.card, payByMethod.online, 1);
  const mColors = { cash: C.grn, card: C.blu, online: C.pur };

  return (
    <div>
      {/* Method Breakdown */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Payment Method Breakdown</div>
        <div className="pay-methods" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {Object.entries(payByMethod).map(([m, v]) => (
            <div key={m}>
              <div style={{ fontSize: 10.5, color: C.sec, textTransform: "capitalize", marginBottom: 2 }}>{m}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: mColors[m] }}>{fmt$(v, settings)}</div>
              <div style={{ background: C.bdr, borderRadius: 3, height: 6, marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: mColors[m], width: `${(v / mx) * 100}%`, transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>{totalRevenue ? ((v / totalRevenue) * 100).toFixed(1) : 0}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by Type */}
      {payByType.length > 0 && (
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Revenue by Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {payByType.map(([type, amt]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={S.tag(C.bluB, C.blu)}>{type}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt$(amt, settings)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment List */}
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>All Payments ({payments.length})</div>
        {payments.length === 0 ? <Empty msg="No payments in this period" /> : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {payments.sort((a, b) => b.date.localeCompare(a.date)).map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.customerName || "—"}</div>
                  <div style={{ fontSize: 10.5, color: C.sec }}>{fmtDate(p.date)} · {p.type || "—"} · <Tag status={p.method || "cash"} /></div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.grn }}>{fmt$(p.amount, settings)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TAB: Payment History (complete detailed ledger)
// ════════════════════════════════════════════════════════════════════
function PaymentHistoryTab({ allPayments, data, singleLessons, groupLessons, sunbedRentals, equipRentals, settings }) {
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Apply filters
  const filtered = useMemo(() => {
    let list = [...allPayments];
    if (search) { const q = search.toLowerCase(); list = list.filter((p) => (p.customerName || "").toLowerCase().includes(q) || (p.notes || "").toLowerCase().includes(q) || (p.type || "").toLowerCase().includes(q)); }
    if (filterMethod) list = list.filter((p) => p.method === filterMethod);
    if (filterType) list = list.filter((p) => p.type === filterType);
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    list.sort((a, b) => b.date.localeCompare(a.date) || (b.id || "").localeCompare(a.id || ""));
    return list;
  }, [allPayments, search, filterMethod, filterType, filterStatus]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      const d = p.date || "Unknown";
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(p);
    });
    return [...map.entries()];
  }, [filtered]);

  // Unique types for filter
  const allTypes = useMemo(() => {
    const s = new Set();
    allPayments.forEach((p) => { if (p.type) s.add(p.type); });
    return [...s].sort();
  }, [allPayments]);

  // Summary
  const completedTotal = filtered.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingTotal = filtered.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount || 0), 0);
  const completedCount = filtered.filter((p) => p.status === "completed").length;
  const pendingCount = filtered.filter((p) => p.status === "pending").length;

  // Lookup related record for a payment
  const getRelatedRecord = (p) => {
    if (!p.refId) return null;
    const sl = (data.singleLessons || []).find((l) => l.id === p.refId);
    if (sl) return { type: "Single Lesson", name: sl.studentName, date: sl.date, level: sl.level, status: sl.status, instructor: sl.instructorName, price: sl.price, time: sl.startTime };
    const gl = (data.groupLessons || []).find((l) => l.id === p.refId);
    if (gl) return { type: "Group Lesson", name: gl.groupName, date: gl.date, level: gl.level, status: gl.status, capacity: `${(gl.students || []).length}/${gl.maxCapacity || 10}`, price: gl.pricePerStudent, time: gl.startTime };
    const sr = (data.sunbedRentals || []).find((r) => r.id === p.refId);
    if (sr) return { type: "Sunbed Rental", name: sr.customerName, item: sr.itemName || sr.itemId, rentalType: sr.rentalType, status: sr.status, price: sr.price };
    const er = (data.equipmentRentals || []).find((r) => r.id === p.refId);
    if (er) return { type: "Equipment Rental", name: er.customerName, item: er.itemName || er.itemId, rentalType: er.rentalType, status: er.status, price: er.price };
    const pk = (data.packageLessons || []).find((l) => l.id === p.refId);
    if (pk) return { type: "Package", name: pk.studentName, packageName: pk.packageName, level: pk.level, progress: `${pk.lessonsCompleted || 0}/${pk.totalLessons}`, status: pk.status, price: pk.price };
    return null;
  };

  const mColors = { cash: C.grn, card: C.blu, online: C.pur };
  const tColors = { lesson: [C.bluB, C.blu], "equipment rental": [C.purB, C.pur], "sunbed rental": [C.ornB, C.orn], package: [C.yelL, C.yelD] };

  return (
    <div>
      {/* ── Summary Cards ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>Completed</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.grn }}>{fmt$(completedTotal, settings)}</div>
          <div style={{ fontSize: 10, color: C.mut }}>{completedCount} payment{completedCount !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>Pending</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.orn }}>{fmt$(pendingTotal, settings)}</div>
          <div style={{ fontSize: 10, color: C.mut }}>{pendingCount} payment{pendingCount !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>Total Records</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.pri }}>{filtered.length}</div>
          <div style={{ fontSize: 10, color: C.mut }}>of {allPayments.length}</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px" }}>Days</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.blu }}>{groupedByDate.length}</div>
          <div style={{ fontSize: 10, color: C.mut }}>with transactions</div>
        </div>
      </div>

      {/* ── Search & Filters ───────────────────────────────────── */}
      <div style={{ ...S.card, marginBottom: 14, padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            style={{ ...S.inp, marginBottom: 0, flex: "1 1 200px", minWidth: 140 }}
            placeholder="Search customer, type, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={{ ...S.sel, marginBottom: 0, flex: "0 1 130px" }} value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
          <select style={{ ...S.sel, marginBottom: 0, flex: "0 1 150px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {allTypes.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select style={{ ...S.sel, marginBottom: 0, flex: "0 1 130px" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
          {(search || filterMethod || filterType || filterStatus) && (
            <button style={S.btnO(C.red)} onClick={() => { setSearch(""); setFilterMethod(""); setFilterType(""); setFilterStatus(""); }}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Grouped Payment List ───────────────────────────────── */}
      {filtered.length === 0 ? <Empty msg="No payments match your filters" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groupedByDate.map(([date, dayPayments]) => {
            const dayTotal = dayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const dayCompleted = dayPayments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount || 0), 0);
            return (
              <div key={date} style={S.card}>
                {/* Day Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: `1.5px solid ${C.bdr}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtDate(date)}</div>
                    <div style={{ fontSize: 10.5, color: C.sec }}>{date} · {dayPayments.length} transaction{dayPayments.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.grn }}>{fmt$(dayCompleted, settings)}</div>
                    {dayCompleted !== dayTotal && <div style={{ fontSize: 10, color: C.mut }}>Total incl. pending: {fmt$(dayTotal, settings)}</div>}
                  </div>
                </div>

                {/* Payment Rows */}
                {dayPayments.map((p) => {
                  const isExpanded = expandedId === p.id;
                  const related = isExpanded ? getRelatedRecord(p) : null;
                  const [tBg, tCol] = tColors[p.type] || [C.bdr, C.sec];

                  return (
                    <div key={p.id}>
                      {/* Main Row — clickable */}
                      <div
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "9px 8px", borderRadius: 8, cursor: "pointer",
                          background: isExpanded ? "rgba(240,200,80,.08)" : "transparent",
                          transition: "background .15s",
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "rgba(0,0,0,.02)"; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.customerName || "—"}</span>
                            <span style={S.tag(tBg, tCol)}>{p.type || "other"}</span>
                            <Tag status={p.method || "cash"} />
                            <Tag status={p.status} />
                          </div>
                          {p.notes && <div style={{ fontSize: 10.5, color: C.mut, marginTop: 1 }}>{p.notes}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: p.status === "completed" ? C.grn : C.orn }}>
                            {fmt$(p.amount, settings)}
                          </span>
                          <span style={{ fontSize: 10, color: C.mut, transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                        </div>
                      </div>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div style={{ margin: "0 8px 8px", padding: 14, background: C.yelL, borderRadius: 10, fontSize: 12 }}>
                          {/* Payment Details */}
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 8 }}>Payment Details</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 10, color: C.sec }}>Payment ID</div>
                              <div style={{ fontSize: 11.5, fontWeight: 500, fontFamily: "monospace" }}>{p.id}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.sec }}>Customer</div>
                              <div style={{ fontSize: 11.5, fontWeight: 600 }}>{p.customerName || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.sec }}>Date</div>
                              <div style={{ fontSize: 11.5, fontWeight: 500 }}>{fmtDate(p.date)} ({p.date})</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.sec }}>Amount</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: p.status === "completed" ? C.grn : C.orn }}>{fmt$(p.amount, settings)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.sec }}>Method</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: mColors[p.method] || C.sec }} />
                                <span style={{ fontSize: 11.5, fontWeight: 500, textTransform: "capitalize" }}>{p.method || "cash"}</span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.sec }}>Status</div>
                              <Tag status={p.status} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.sec }}>Type</div>
                              <span style={S.tag(tBg, tCol)}>{p.type || "other"}</span>
                            </div>
                            {p.notes && (
                              <div style={{ gridColumn: "2/4" }}>
                                <div style={{ fontSize: 10, color: C.sec }}>Notes</div>
                                <div style={{ fontSize: 11.5, fontWeight: 500 }}>{p.notes}</div>
                              </div>
                            )}
                          </div>

                          {/* Related Record */}
                          {related ? (
                            <>
                              <div style={{ borderTop: `1px solid ${C.bdr}`, marginTop: 4, paddingTop: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: C.sec, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 8 }}>Linked {related.type}</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                  {related.name && <div><div style={{ fontSize: 10, color: C.sec }}>{related.type.includes("Lesson") || related.type === "Package" ? "Student/Group" : "Customer"}</div><div style={{ fontSize: 11.5, fontWeight: 600 }}>{related.name}</div></div>}
                                  {related.date && <div><div style={{ fontSize: 10, color: C.sec }}>Date</div><div style={{ fontSize: 11.5 }}>{fmtDate(related.date)}</div></div>}
                                  {related.time && <div><div style={{ fontSize: 10, color: C.sec }}>Time</div><div style={{ fontSize: 11.5 }}>{related.time}</div></div>}
                                  {related.level && <div><div style={{ fontSize: 10, color: C.sec }}>Level</div><div style={{ fontSize: 11.5, textTransform: "capitalize" }}>{related.level}</div></div>}
                                  {related.instructor && <div><div style={{ fontSize: 10, color: C.sec }}>Instructor</div><div style={{ fontSize: 11.5 }}>{related.instructor}</div></div>}
                                  {related.status && <div><div style={{ fontSize: 10, color: C.sec }}>Status</div><Tag status={related.status} /></div>}
                                  {related.price != null && <div><div style={{ fontSize: 10, color: C.sec }}>Price</div><div style={{ fontSize: 11.5, fontWeight: 600 }}>{fmt$(related.price, settings)}</div></div>}
                                  {related.item && <div><div style={{ fontSize: 10, color: C.sec }}>Item</div><div style={{ fontSize: 11.5 }}>{related.item}</div></div>}
                                  {related.rentalType && <div><div style={{ fontSize: 10, color: C.sec }}>Rental Type</div><div style={{ fontSize: 11.5, textTransform: "capitalize" }}>{related.rentalType}</div></div>}
                                  {related.capacity && <div><div style={{ fontSize: 10, color: C.sec }}>Capacity</div><div style={{ fontSize: 11.5 }}>{related.capacity}</div></div>}
                                  {related.packageName && <div><div style={{ fontSize: 10, color: C.sec }}>Package</div><div style={{ fontSize: 11.5 }}>{related.packageName}</div></div>}
                                  {related.progress && <div><div style={{ fontSize: 10, color: C.sec }}>Progress</div><div style={{ fontSize: 11.5 }}>{related.progress} lessons</div></div>}
                                </div>
                              </div>
                            </>
                          ) : p.refId ? (
                            <div style={{ borderTop: `1px solid ${C.bdr}`, marginTop: 4, paddingTop: 10, fontSize: 11, color: C.mut }}>
                              Linked record (ID: {p.refId}) — original record may have been deleted
                            </div>
                          ) : (
                            <div style={{ borderTop: `1px solid ${C.bdr}`, marginTop: 4, paddingTop: 10, fontSize: 11, color: C.mut }}>
                              No linked record — standalone payment
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TAB: Lessons
// ════════════════════════════════════════════════════════════════════
function LessonsTab({ allLessons, singleLessons, groupLessons, packageLessons, lessonsByStatus, settings }) {
  const statusColors = { scheduled: [C.bluB, C.blu], "in-progress": [C.yelL, C.yelD], completed: [C.grnB, C.grn], cancelled: ["rgba(232,90,90,.12)", C.red] };

  return (
    <div>
      {/* Counts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginBottom: 12 }}>
        {[
          ["Single", singleLessons.length, C.pri],
          ["Group", groupLessons.length, C.yel],
          ["Package", packageLessons.length, C.pur],
        ].map(([l, v, col]) => (
          <div key={l} style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: C.sec }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Status Breakdown</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(lessonsByStatus).map(([st, count]) => {
            const [bg, col] = statusColors[st] || [C.bdr, C.sec];
            return (
              <div key={st} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={S.tag(bg, col)}>{st}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson List */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>All Lessons ({allLessons.length})</div>
        {allLessons.length === 0 ? <Empty msg="No lessons in this period" /> : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {allLessons.sort((a, b) => b.date.localeCompare(a.date)).map((l) => {
              return (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{l.studentName || l.groupName || "—"}</span>
                      <span style={S.tag(l._type === "single" ? C.bluB : C.yelL, l._type === "single" ? C.blu : C.yelD)}>{l._type}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: C.sec }}>
                      {fmtDate(l.date)} · {l.level || "—"} · {l.instructorName || "No instructor"} · <Tag status={l.status} /> · <Tag status={l.paymentStatus || "pending"} />
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt$(l.price || l.pricePerStudent || 0, settings)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TAB: Rentals
// ════════════════════════════════════════════════════════════════════
function RentalsTab({ sunbedRentals, equipRentals, settings }) {
  const allRentals = [
    ...sunbedRentals.map((r) => ({ ...r, _type: "sunbed" })),
    ...equipRentals.map((r) => ({ ...r, _type: "equipment" })),
  ];
  const activeCount = allRentals.filter((r) => r.status === "active").length;
  const completedCount = allRentals.filter((r) => r.status === "completed").length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 12 }}>
        {[
          ["Sunbed", sunbedRentals.length, C.orn],
          ["Equipment", equipRentals.length, C.blu],
          ["Active", activeCount, C.grn],
          ["Completed", completedCount, C.sec],
        ].map(([l, v, col]) => (
          <div key={l} style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: C.sec }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>All Rentals ({allRentals.length})</div>
        {allRentals.length === 0 ? <Empty msg="No rentals in this period" /> : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {allRentals.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.customerName || "—"}</span>
                    <span style={S.tag(r._type === "sunbed" ? C.ornB : C.bluB, r._type === "sunbed" ? C.orn : C.blu)}>{r._type}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: C.sec }}>
                    {r.itemName || r.itemId || "—"} · {r.rentalType || "—"} · <Tag status={r.status} /> · <Tag status={r.paymentStatus || "pending"} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.orn }}>{fmt$(r.price || 0, settings)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TAB: Expenses
// ════════════════════════════════════════════════════════════════════
function ExpensesTab({ dailyExpenses, expByCat, totalDailyExp, instrAdvances, instrExpenses, totalInstrCost, settings }) {
  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec }}>Daily Expenses</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.orn }}>{fmt$(totalDailyExp, settings)}</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec }}>Instructor Costs</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.orn }}>{fmt$(totalInstrCost, settings)}</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: C.sec }}>Total Outgoing</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.red }}>{fmt$(totalDailyExp + totalInstrCost, settings)}</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {expByCat.length > 0 && (
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Category Breakdown</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {expByCat.map(([cat, amt]) => {
              const cc = CAT_COLORS[cat] || CAT_COLORS.other;
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...S.tag(cc.bg, cc.col), fontSize: 10.5 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt$(amt, settings)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Expenses List */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Daily Expenses ({dailyExpenses.length})</div>
        {dailyExpenses.length === 0 ? <Empty msg="No daily expenses in this period" /> : (
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {dailyExpenses.sort((a, b) => b.date.localeCompare(a.date)).map((e) => {
              const cc = CAT_COLORS[e.category] || CAT_COLORS.other;
              return (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{e.description}</span>
                      <span style={S.tag(cc.bg, cc.col)}>{e.category}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: C.sec }}>{fmtDate(e.date)}{e.notes ? ` · ${e.notes}` : ""}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.orn }}>{fmt$(e.amount, settings)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructor Advances & Expenses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Instructor Advances ({instrAdvances.length})</div>
          {instrAdvances.length === 0 ? <div style={{ fontSize: 11, color: C.mut, textAlign: "center", padding: 10 }}>None</div> : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {instrAdvances.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.bdr}` }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{a.instructorName}</div>
                    <div style={{ fontSize: 10, color: C.sec }}>{fmtDate(a.date)}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.grn }}>{fmt$(a.amount, settings)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Instructor Expenses ({instrExpenses.length})</div>
          {instrExpenses.length === 0 ? <div style={{ fontSize: 11, color: C.mut, textAlign: "center", padding: 10 }}>None</div> : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {instrExpenses.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.bdr}` }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{e.instructorName}</div>
                    <div style={{ fontSize: 10, color: C.sec }}>{fmtDate(e.date)} · {e.category || ""}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.orn }}>{fmt$(e.amount, settings)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TAB: People Activity
// ════════════════════════════════════════════════════════════════════
function PeopleTab({ data, singleLessons, groupLessons, instrAdvances, settings }) {
  const instructors = data.instructors || [];
  const deleteRequests = (data.deleteRequests || []).filter((r) => r.status === "pending");

  // Instructor performance in range
  const instrStats = useMemo(() => {
    return instructors.map((inst) => {
      const sLessons = singleLessons.filter((l) => l.instructorName === inst.name);
      const gLessons = groupLessons.filter((l) => l.instructorName === inst.name);
      const advances = instrAdvances.filter((a) => a.instructorName === inst.name);
      const totalAdv = advances.reduce((s, a) => s + Number(a.amount || 0), 0);
      return { ...inst, singleCount: sLessons.length, groupCount: gLessons.length, totalLessons: sLessons.length + gLessons.length, totalAdvances: totalAdv };
    }).sort((a, b) => b.totalLessons - a.totalLessons);
  }, [instructors, singleLessons, groupLessons, instrAdvances]);

  // Students unique in range
  const uniqueStudents = useMemo(() => {
    const names = new Set();
    singleLessons.forEach((l) => { if (l.studentName) names.add(l.studentName); });
    groupLessons.forEach((l) => { (l.students || []).forEach((s) => { if (s.name) names.add(s.name); }); });
    return names.size;
  }, [singleLessons, groupLessons]);

  return (
    <div>
      {/* Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
        {[
          ["Unique Students", uniqueStudents, C.blu],
          ["Instructors", instructors.length, C.pur],
          ["Pending Deletes", deleteRequests.length, deleteRequests.length > 0 ? C.red : C.sec],
        ].map(([l, v, col]) => (
          <div key={l} style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: C.sec }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Instructor Performance */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Instructor Performance</div>
        {instrStats.length === 0 ? <div style={{ fontSize: 11, color: C.mut, textAlign: "center", padding: 10 }}>No instructors</div> : (
          <div>
            {instrStats.map((inst) => (
              <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{inst.name}</div>
                  <div style={{ fontSize: 10.5, color: C.sec }}>
                    {inst.totalLessons} lesson{inst.totalLessons !== 1 ? "s" : ""} ({inst.singleCount} single, {inst.groupCount} group) · <Tag status={inst.availability || "available"} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.grn }}>{fmt$(inst.totalAdvances, settings)}</div>
                  <div style={{ fontSize: 9.5, color: C.sec }}>advances</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Delete Requests */}
      {deleteRequests.length > 0 && (
        <div style={{ ...S.card, borderLeft: `3px solid ${C.red}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.red }}>Pending Delete Requests ({deleteRequests.length})</div>
          {deleteRequests.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.bdr}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{r.itemDesc || "Unknown item"}</div>
                <div style={{ fontSize: 10.5, color: C.sec }}>By {r.userName || "—"} · Reason: {r.reason || "—"}</div>
              </div>
              <div style={{ fontSize: 10, color: C.mut }}>{fmtDate(r.date)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
