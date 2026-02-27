import { useState } from "react";
import { useAppContext, usePinVerify } from "../../../context";
import { C, S } from "../../../styles";
import { genId, today, fmt$, fmtDate } from "../../../utils";
import { recordPayment } from "../../../utils/payments";
import { Modal, DeleteGuard, Tag, Empty, Header } from "../../../components/ui";
import { PaymentSection } from "../../../components/payment";

export default function PackageLessonsPage() {
  const { data, update, settings } = useAppContext();
  const { verifyPin } = usePinVerify();
  const [open, setOpen] = useState(false);
  const [ed, setEd] = useState(null);
  const [del, setDel] = useState(null);
  const [f, sf] = useState({});
  const pkgs = data.packageLessons || [];

  const add = () => {
    setEd(null);
    sf({ packageType: settings.packages[0]?.id, studentName: "", status: "active", paymentStatus: "pending", paymentMethod: "", lessonsCompleted: 0, lessonRecords: [] });
    setOpen(true);
  };
  const edit = (p) => { setEd(p); sf({ ...p }); setOpen(true); };

  const doSave = (op) => {
    const list = [...pkgs]; const def = settings.packages.find((p) => p.id === f.packageType);
    const item = { ...f, packageName: def?.name, level: def?.level, totalLessons: def?.lessons, price: def?.price, operatorName: op.name, operatorId: op.id };
    if (ed) { const i = list.findIndex((p) => p.id === ed.id); if (i >= 0) list[i] = { ...list[i], ...item }; }
    else list.push({ ...item, id: genId(), lessonRecords: [] });
    update("packageLessons", list);
    if (item.paymentStatus === "paid" && Number(item.paidAmount || item.price) > 0) {
      recordPayment(data, update, { customerName: item.studentName, amount: item.paidAmount || item.price, method: item.paymentMethod, type: "package", date: today() });
    }
    setOpen(false);
  };
  const doDelete = () => { update("packageLessons", pkgs.filter((p) => p.id !== del)); setDel(null); };
  const addLesson = (pkg, op) => { const list = [...pkgs]; const i = list.findIndex((p) => p.id === pkg.id); list[i] = { ...list[i], lessonRecords: [...(list[i].lessonRecords || []), { id: genId(), date: today(), completed: false, operatorName: op.name, operatorId: op.id }] }; update("packageLessons", list); };
  const completeLesson = (pkg, rid, op) => { const list = [...pkgs]; const i = list.findIndex((p) => p.id === pkg.id); const recs = (list[i].lessonRecords || []).map((r) => r.id === rid ? { ...r, completed: true, operatorName: op.name, operatorId: op.id } : r); const done = recs.filter((r) => r.completed).length; list[i] = { ...list[i], lessonRecords: recs, lessonsCompleted: done, status: done >= (list[i].totalLessons || 999) ? "completed" : "active" }; update("packageLessons", list); };

  return (
    <div>
      <Header title="Package Lessons" sub="Multi-lesson packages with progress tracking" onAdd={add} addLabel="+ New Package" />
      {pkgs.length === 0 ? <Empty /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
          {pkgs.map((p) => {
            const pr = p.totalLessons ? ((p.lessonsCompleted || 0) / p.totalLessons) * 100 : 0;
            return (
              <div key={p.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.packageName}</span><Tag status={p.status} /></div>
                <div style={{ fontSize: 11.5, color: C.sec, marginBottom: 6 }}>{p.studentName} · {p.level} · {fmt$(p.price, settings)}</div>
                <div style={{ background: C.bdr, borderRadius: 4, height: 6, marginBottom: 4, overflow: "hidden" }}><div style={{ background: C.yel, height: "100%", borderRadius: 4, width: `${pr}%` }} /></div>
                <div style={{ fontSize: 10.5, color: C.mut, marginBottom: 8 }}>{p.lessonsCompleted || 0}/{p.totalLessons} lessons · <Tag status={p.paymentStatus || "pending"} /> {p.paymentMethod && <Tag status={p.paymentMethod} />}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {p.status === "active" && <button style={S.btnO()} onClick={() => verifyPin((op) => addLesson(p, op))}>+ Lesson</button>}
                  <button style={S.btnO()} onClick={() => edit(p)}>Edit</button>
                  <button style={S.btnO(C.red)} onClick={() => setDel(p.id)}>✕</button>
                </div>
                {(p.lessonRecords || []).length > 0 && (
                  <div style={{ marginTop: 8 }}>{(p.lessonRecords || []).map((r, i) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0" }}>
                      <span>Lesson {i + 1} — {fmtDate(r.date)}</span>{r.completed ? <Tag status="completed" /> : <button style={S.btnO()} onClick={() => verifyPin((op) => completeLesson(p, r.id, op))}>Complete</button>}
                    </div>
                  ))}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={ed ? "Edit Package" : "New Package"}>
        <label style={S.label}>Student Name</label><select style={S.sel} value={f.studentName || ""} onChange={(e) => sf({ ...f, studentName: e.target.value })}><option value="">Select Student</option>{(data.students || []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
        <label style={S.label}>Package Type</label>
        <select style={S.sel} value={f.packageType || ""} onChange={(e) => sf({ ...f, packageType: e.target.value })}>{settings.packages.map((p) => <option key={p.id} value={p.id}>{p.name} — LKR {p.price}</option>)}</select>
        <label style={S.label}>Notes</label><textarea style={{ ...S.inp, minHeight: 40, resize: "vertical" }} value={f.notes || ""} onChange={(e) => sf({ ...f, notes: e.target.value })} />
        <PaymentSection form={f} setForm={sf} totalAmount={settings.packages.find((p) => p.id === f.packageType)?.price} label="Package Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}><button style={S.btn("transparent", C.sec)} onClick={() => setOpen(false)}>Cancel</button><button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => doSave(op))}>Save</button></div>
      </Modal>
      <DeleteGuard open={!!del} onYes={doDelete} onNo={() => setDel(null)} itemDesc={`Package: ${(pkgs.find((p) => p.id === del) || {}).studentName || "package"} — ${(pkgs.find((p) => p.id === del) || {}).packageName || ""}`} dataKey="packageLessons" itemId={del} />
    </div>
  );
}
