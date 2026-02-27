import { useState } from "react";
import { useAppContext, usePinVerify } from "../../../context";
import { C, S } from "../../../styles";
import { genId, today, fmt$, fmtDate, fmtElapsed } from "../../../utils";
import { recordPayment } from "../../../utils/payments";
import { Modal, DeleteGuard, Tag, Empty, Header, Search, Filter } from "../../../components/ui";

export default function GroupLessonsPage() {
  const { data, update, settings, tick } = useAppContext();
  const { verifyPin } = usePinVerify();
  const [search, setSearch] = useState("");
  const [filt, setFilt] = useState("");
  const [open, setOpen] = useState(false);
  const [ed, setEd] = useState(null);
  const [del, setDel] = useState(null);
  const [f, sf] = useState({});
  const [stuModal, setStuModal] = useState(null);
  const [newStu, setNewStu] = useState({ name: "", paymentStatus: "pending", paymentMethod: "", amount: "" });

  const items = (data.groupLessons || []).filter(
    (l) => (!search || (l.groupName || "").toLowerCase().includes(search.toLowerCase())) && (!filt || l.status === filt)
  );

  const add = () => {
    setEd(null);
    sf({ date: today(), level: "beginner", pricePerStudent: settings.groupPrices.beginner, status: "scheduled", maxCapacity: 10, students: [], paymentStatus: "pending", paymentMethod: "" });
    setOpen(true);
  };
  const edit = (l) => { setEd(l); sf({ ...l }); setOpen(true); };

  const doSave = (op) => {
    const list = [...(data.groupLessons || [])];
    const item = { ...f, operatorName: op.name, operatorId: op.id };
    if (ed) { const i = list.findIndex((x) => x.id === ed.id); if (i >= 0) list[i] = { ...list[i], ...item }; }
    else list.push({ ...item, id: genId(), students: item.students || [] });
    update("groupLessons", list);
    setOpen(false);
  };
  const doDelete = () => { update("groupLessons", (data.groupLessons || []).filter((l) => l.id !== del)); setDel(null); };
  const start = (l, op) => { const list = [...(data.groupLessons || [])]; const i = list.findIndex((x) => x.id === l.id); list[i] = { ...list[i], status: "in-progress", timerStart: Date.now(), operatorName: op.name, operatorId: op.id }; update("groupLessons", list); };
  const end = (l, op) => { const list = [...(data.groupLessons || [])]; const i = list.findIndex((x) => x.id === l.id); list[i] = { ...list[i], status: "completed", timerStart: null, operatorName: op.name, operatorId: op.id }; update("groupLessons", list); };

  const addStu = (lessonId, op) => {
    if (!newStu.name) return;
    const list = [...(data.groupLessons || [])]; const i = list.findIndex((x) => x.id === lessonId);
    const lesson = list[i];
    const stu = { ...newStu, id: genId(), amount: newStu.amount || lesson.pricePerStudent, operatorName: op.name, operatorId: op.id };
    list[i] = { ...list[i], students: [...(list[i].students || []), stu] };
    update("groupLessons", list);
    if (newStu.paymentStatus === "paid" && Number(stu.amount) > 0) {
      recordPayment(data, update, { customerName: newStu.name, amount: stu.amount, method: newStu.paymentMethod, type: "lesson", refId: lessonId, date: today() });
    }
    setNewStu({ name: "", paymentStatus: "pending", paymentMethod: "", amount: "" });
  };
  const removeStu = (lessonId, stuId, op) => { const list = [...(data.groupLessons || [])]; const i = list.findIndex((x) => x.id === lessonId); list[i] = { ...list[i], students: (list[i].students || []).filter((s) => s.id !== stuId), operatorName: op.name, operatorId: op.id }; update("groupLessons", list); };

  const payStudent = (lessonId, stu, op) => {
    const list = [...(data.groupLessons || [])]; const i = list.findIndex((x) => x.id === lessonId);
    list[i] = { ...list[i], students: (list[i].students || []).map((s) => s.id === stu.id ? { ...s, paymentStatus: "paid", paymentMethod: "cash", operatorName: op.name, operatorId: op.id } : s) };
    update("groupLessons", list);
    recordPayment(data, update, { customerName: stu.name, amount: stu.amount || list[i].pricePerStudent, method: "cash", type: "lesson", refId: lessonId, date: today() });
  };

  const setF = (k, v) => { const n = { ...f, [k]: v }; if (k === "level" && settings.groupPrices[v]) n.pricePerStudent = settings.groupPrices[v]; sf(n); };

  return (
    <div>
      <Header title="Group Lessons" sub="Group surf sessions" onAdd={add} addLabel="+ New Group">
        <Search v={search} set={setSearch} ph="Search group..." />
        <Filter v={filt} set={setFilt} ph="All Status" opts={[{ v: "scheduled", l: "Scheduled" }, { v: "in-progress", l: "In Progress" }, { v: "completed", l: "Completed" }, { v: "cancelled", l: "Cancelled" }]} />
      </Header>
      {items.length === 0 ? <Empty msg="No group lessons" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((l) => {
            const el = l.timerStart ? tick - l.timerStart : 0;
            return (
              <div key={l.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.groupName || "Group Lesson"}</div>
                    <div style={{ fontSize: 11, color: C.sec }}>{fmtDate(l.date)} · {l.level} · {fmt$(l.pricePerStudent, settings)}/student · {(l.students || []).length}/{l.maxCapacity || 10}</div>
                    {l.operatorName && <div style={{ fontSize: 10, color: C.blu }}>by {l.operatorName}</div>}
                  </div>
                  <div style={{ ...S.row, flexWrap: "wrap" }}>
                    {l.status === "in-progress" && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.yelD }}>{fmtElapsed(el)}</span>}
                    <Tag status={l.status} />
                    {l.status === "scheduled" && <button style={S.btn(C.yel, C.pri)} onClick={() => verifyPin((op) => start(l, op))}>Start</button>}
                    {l.status === "in-progress" && <button style={S.btnO(C.orn)} onClick={() => verifyPin((op) => end(l, op))}>End</button>}
                    <button style={S.btnO()} onClick={() => setStuModal(l.id)}>Students</button>
                    <button style={S.btnO()} onClick={() => edit(l)}>Edit</button>
                    <button style={S.btnO(C.red)} onClick={() => setDel(l.id)}>✕</button>
                  </div>
                </div>
                {(l.students || []).length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(l.students || []).map((s) => (
                      <div key={s.id} style={{ ...S.tag(s.paymentStatus === "paid" ? C.grnB : C.ornB, s.paymentStatus === "paid" ? C.grn : C.orn), fontSize: 10 }}>{s.name} — {s.paymentStatus}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={ed ? "Edit Group" : "New Group Lesson"}>
        <label style={S.label}>Group Name</label><input style={S.inp} value={f.groupName || ""} onChange={(e) => setF("groupName", e.target.value)} />
        <div style={S.grid2}>
          <div><label style={S.label}>Date</label><input style={S.inp} type="date" value={f.date || ""} onChange={(e) => setF("date", e.target.value)} /></div>
          <div><label style={S.label}>Start Time</label><select style={S.sel} value={f.startTime || ""} onChange={(e) => setF("startTime", e.target.value)}><option value="">Select</option>{settings.timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div className="grid3-form" style={S.grid3}>
          <div><label style={S.label}>Level</label><select style={S.sel} value={f.level || ""} onChange={(e) => setF("level", e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          <div><label style={S.label}>Price/Student</label><input style={S.inp} type="number" value={f.pricePerStudent || ""} onChange={(e) => setF("pricePerStudent", e.target.value)} /></div>
          <div><label style={S.label}>Max Capacity</label><input style={S.inp} type="number" value={f.maxCapacity || ""} onChange={(e) => setF("maxCapacity", e.target.value)} /></div>
        </div>
        <label style={S.label}>Notes</label><textarea style={{ ...S.inp, minHeight: 40, resize: "vertical" }} value={f.notes || ""} onChange={(e) => setF("notes", e.target.value)} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}><button style={S.btn("transparent", C.sec)} onClick={() => setOpen(false)}>Cancel</button><button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => doSave(op))}>Save</button></div>
      </Modal>

      {/* Student Management with per-student payment */}
      <Modal open={!!stuModal} onClose={() => setStuModal(null)} title="Manage Students" wide>
        {(() => {
          const lesson = (data.groupLessons || []).find((l) => l.id === stuModal);
          if (!lesson) return null;
          return (
            <div>
              <div style={{ background: C.yelL, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{lesson.groupName} — {fmt$(lesson.pricePerStudent, settings)}/student</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: C.sec }}>ADD STUDENT</div>
              <div className="grid5-form" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 14 }}>
                <div><label style={S.label}>Name</label><select style={{ ...S.sel, marginBottom: 0 }} value={newStu.name} onChange={(e) => setNewStu({ ...newStu, name: e.target.value })}><option value="">Select Student</option>{(data.students || []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                <div><label style={S.label}>Payment</label><select style={{ ...S.sel, marginBottom: 0 }} value={newStu.paymentStatus} onChange={(e) => setNewStu({ ...newStu, paymentStatus: e.target.value })}><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
                <div><label style={S.label}>Method</label><select style={{ ...S.sel, marginBottom: 0 }} value={newStu.paymentMethod} onChange={(e) => setNewStu({ ...newStu, paymentMethod: e.target.value })}><option value="">—</option><option value="cash">Cash</option><option value="card">Card</option><option value="online">Online</option></select></div>
                <div><label style={S.label}>Amount</label><input style={{ ...S.inp, marginBottom: 0 }} type="number" value={newStu.amount} onChange={(e) => setNewStu({ ...newStu, amount: e.target.value })} placeholder={lesson.pricePerStudent} /></div>
                <button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => addStu(lesson.id, op))}>Add</button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.sec }}>ENROLLED ({(lesson.students || []).length})</div>
              {(lesson.students || []).map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</span>
                    <Tag status={s.paymentStatus} />{s.paymentMethod && <Tag status={s.paymentMethod} />}
                    <span style={{ fontSize: 11, color: C.sec }}>{fmt$(s.amount || lesson.pricePerStudent, settings)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {s.paymentStatus !== "paid" && <button style={S.btnO(C.grn)} onClick={() => verifyPin((op) => payStudent(lesson.id, s, op))}>💰 Pay</button>}
                    <button style={S.btnO(C.red)} onClick={() => verifyPin((op) => removeStu(lesson.id, s.id, op))}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>
      <DeleteGuard open={!!del} onYes={doDelete} onNo={() => setDel(null)} itemDesc={`Group Lesson: ${((data.groupLessons || []).find((l) => l.id === del) || {}).groupName || "group"}`} dataKey="groupLessons" itemId={del} />
    </div>
  );
}
