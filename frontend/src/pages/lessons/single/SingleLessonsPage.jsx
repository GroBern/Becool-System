import { useState } from "react";
import { useAppContext, usePinVerify } from "../../../context";
import { C, S } from "../../../styles";
import { genId, today, fmt$, fmtDate, fmtElapsed } from "../../../utils";
import { recordPayment } from "../../../utils/payments";
import { Modal, DeleteGuard, Tag, Empty, Header, Search, Filter } from "../../../components/ui";
import { PaymentSection } from "../../../components/payment";

export default function SingleLessonsPage() {
  const { data, update, settings, tick } = useAppContext();
  const { verifyPin } = usePinVerify();
  const [search, setSearch] = useState("");
  const [filt, setFilt] = useState("");
  const [open, setOpen] = useState(false);
  const [ed, setEd] = useState(null);
  const [del, setDel] = useState(null);
  const [f, sf] = useState({});

  const items = (data.singleLessons || []).filter(
    (l) => (!search || (l.studentName || "").toLowerCase().includes(search.toLowerCase())) && (!filt || l.status === filt)
  );

  const add = () => {
    setEd(null);
    sf({ date: today(), level: "beginner", price: settings.singlePrices.beginner, status: "scheduled", paymentStatus: "pending", paymentMethod: "" });
    setOpen(true);
  };
  const edit = (l) => { setEd(l); sf({ ...l }); setOpen(true); };

  const doSave = (op) => {
    const list = [...(data.singleLessons || [])];
    const item = { ...f, operatorName: op.name, operatorId: op.id };
    if (ed) { const i = list.findIndex((x) => x.id === ed.id); if (i >= 0) list[i] = { ...list[i], ...item }; }
    else list.push({ ...item, id: genId() });
    update("singleLessons", list);
    if (item.paymentStatus === "paid" && Number(item.paidAmount || item.price) > 0) {
      recordPayment(data, update, { customerName: item.studentName, amount: item.paidAmount || item.price, method: item.paymentMethod, type: "lesson", refId: item.id || ed?.id, date: item.date });
    }
    setOpen(false);
  };

  const doDelete = () => { update("singleLessons", (data.singleLessons || []).filter((l) => l.id !== del)); setDel(null); };

  const start = (l, op) => { const list = [...(data.singleLessons || [])]; const i = list.findIndex((x) => x.id === l.id); list[i] = { ...list[i], status: "in-progress", timerStart: Date.now(), operatorName: op.name, operatorId: op.id }; update("singleLessons", list); };
  const end = (l, op) => { const list = [...(data.singleLessons || [])]; const i = list.findIndex((x) => x.id === l.id); list[i] = { ...list[i], status: "completed", timerStart: null, operatorName: op.name, operatorId: op.id }; update("singleLessons", list); };

  // Quick collect payment on a lesson
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({});
  const openPay = (l) => { setPayModal(l); setPayForm({ paymentStatus: "paid", paymentMethod: "cash", paidAmount: l.price }); };
  const doPay = (op) => {
    const list = [...(data.singleLessons || [])]; const i = list.findIndex((x) => x.id === payModal.id);
    list[i] = { ...list[i], paymentStatus: payForm.paymentStatus, paymentMethod: payForm.paymentMethod, paidAmount: payForm.paidAmount, operatorName: op.name, operatorId: op.id };
    update("singleLessons", list);
    if (payForm.paymentStatus === "paid" || payForm.paymentStatus === "partial") {
      recordPayment(data, update, { customerName: payModal.studentName, amount: payForm.paidAmount || payModal.price, method: payForm.paymentMethod, type: "lesson", refId: payModal.id, date: today() });
    }
    setPayModal(null);
  };

  const setF = (k, v) => { const n = { ...f, [k]: v }; if (k === "level" && settings.singlePrices[v]) n.price = settings.singlePrices[v]; sf(n); };

  return (
    <div>
      <Header title="Single Lessons" sub="One-on-one surf lessons" onAdd={add} addLabel="+ New Lesson">
        <Search v={search} set={setSearch} ph="Search student..." />
        <Filter v={filt} set={setFilt} ph="All Status" opts={[{ v: "scheduled", l: "Scheduled" }, { v: "in-progress", l: "In Progress" }, { v: "completed", l: "Completed" }, { v: "cancelled", l: "Cancelled" }]} />
      </Header>

      {items.length === 0 ? <Empty msg="No lessons found" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((l) => {
            const el = l.timerStart ? tick - l.timerStart : 0;
            return (
              <div key={l.id} className="lesson-card" style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.studentName || "—"}</div>
                  <div style={{ fontSize: 11, color: C.sec }}>{fmtDate(l.date)} · {l.startTime || ""} · {l.level} · {fmt$(l.price, settings)}</div>
                  {l.instructorName && <div style={{ fontSize: 10, color: C.mut }}>Instructor: {l.instructorName}</div>}
                  {l.operatorName && <div style={{ fontSize: 10, color: C.blu }}>by {l.operatorName}</div>}
                </div>
                <div className="lesson-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {l.status === "in-progress" && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.yelD }}>{fmtElapsed(el)}</span>}
                  <Tag status={l.status} /><Tag status={l.paymentStatus || "pending"} />
                  {l.paymentStatus !== "paid" && <button style={S.btnO(C.grn)} onClick={() => openPay(l)}>💰 Pay</button>}
                  {l.status === "scheduled" && <button style={S.btn(C.yel, C.pri)} onClick={() => verifyPin((op) => start(l, op))}>Start</button>}
                  {l.status === "in-progress" && <button style={S.btnO(C.orn)} onClick={() => verifyPin((op) => end(l, op))}>End</button>}
                  <button style={S.btnO()} onClick={() => edit(l)}>Edit</button>
                  <button style={S.btnO(C.red)} onClick={() => setDel(l.id)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={ed ? "Edit Lesson" : "New Single Lesson"}>
        <label style={S.label}>Student Name</label>
        <select style={S.sel} value={f.studentName || ""} onChange={(e) => setF("studentName", e.target.value)}><option value="">Select Student</option>{(data.students || []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
        <div style={S.grid2}>
          <div><label style={S.label}>Date</label><input style={S.inp} type="date" value={f.date || ""} onChange={(e) => setF("date", e.target.value)} /></div>
          <div><label style={S.label}>Start Time</label><select style={S.sel} value={f.startTime || ""} onChange={(e) => setF("startTime", e.target.value)}><option value="">Select</option>{settings.timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div style={S.grid2}>
          <div><label style={S.label}>Level</label><select style={S.sel} value={f.level || ""} onChange={(e) => setF("level", e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          <div><label style={S.label}>Price (LKR)</label><input style={S.inp} type="number" value={f.price || ""} onChange={(e) => setF("price", e.target.value)} /></div>
        </div>
        <label style={S.label}>Instructor</label>
        <select style={S.sel} value={f.instructorName || ""} onChange={(e) => setF("instructorName", e.target.value)}><option value="">Select</option>{(data.instructors || []).map((i) => <option key={i.id} value={i.name}>{i.name}</option>)}</select>
        <label style={S.label}>Instructor Flat Price (optional override)</label>
        <input style={S.inp} type="number" value={f.instructorFlatPrice || ""} onChange={(e) => setF("instructorFlatPrice", e.target.value)} placeholder="Leave blank for normal commission" />
        <label style={S.label}>Notes</label>
        <textarea style={{ ...S.inp, minHeight: 50, resize: "vertical" }} value={f.notes || ""} onChange={(e) => setF("notes", e.target.value)} />
        <PaymentSection form={f} setForm={sf} totalAmount={f.price} label="Lesson Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setOpen(false)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => doSave(op))}>Save Lesson</button>
        </div>
      </Modal>

      {/* Quick Pay Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Collect Payment — ${payModal?.studentName || ""}`}>
        <div style={{ background: C.yelL, borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Lesson Price</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt$(payModal?.price, settings)}</span>
        </div>
        <PaymentSection form={payForm} setForm={setPayForm} totalAmount={payModal?.price} label="Collect Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setPayModal(null)}>Cancel</button>
          <button style={S.btn(C.grn, "#fff")} onClick={() => verifyPin((op) => doPay(op))}>💰 Confirm Payment</button>
        </div>
      </Modal>

      <DeleteGuard open={!!del} onYes={doDelete} onNo={() => setDel(null)} msg="Delete this lesson?" itemDesc={`Single Lesson: ${((data.singleLessons || []).find((l) => l.id === del) || {}).studentName || "lesson"}`} dataKey="singleLessons" itemId={del} />
    </div>
  );
}
