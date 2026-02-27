import { useState } from "react";
import { useAppContext, usePinVerify } from "../../context";
import { C, S } from "../../styles";
import { genId, today, fmt$, fmtDate, fmtElapsed } from "../../utils";
import { recordPayment } from "../../utils/payments";
import { Modal, DeleteGuard, Tag, Empty, Header } from "../../components/ui";
import { PaymentSection } from "../../components/payment";

// ════════════════════════════════════════════════════════════════════
//  ACTIVITIES — live hub for all active operations
// ════════════════════════════════════════════════════════════════════
export default function ActivitiesPage() {
  const { data, update, settings, tick } = useAppContext();
  const { verifyPin } = usePinVerify();

  // ── Gather all active items ────────────────────────────────────
  const activeSingle = (data.singleLessons || []).filter((l) => l.status === "in-progress");
  const scheduledSingle = (data.singleLessons || []).filter((l) => l.status === "scheduled" && l.date === today());
  const activeGroup = (data.groupLessons || []).filter((l) => l.status === "in-progress");
  const scheduledGroup = (data.groupLessons || []).filter((l) => l.status === "scheduled" && l.date === today());
  const activeEquip = (data.equipmentRentals || []).filter((r) => r.status === "active");
  const activeSunbed = (data.sunbedRentals || []).filter((r) => r.status === "active");
  const totalActive = activeSingle.length + activeGroup.length + activeEquip.length + activeSunbed.length;
  const totalScheduled = scheduledSingle.length + scheduledGroup.length;

  // ── Modal state — which "add" form is open ─────────────────────
  const [addType, setAddType] = useState(null); // "single" | "group" | "rental"
  const [f, sf] = useState({});
  const [del, setDel] = useState(null);
  const [delType, setDelType] = useState(null);

  // ── Quick pay modal ────────────────────────────────────────────
  const [payModal, setPayModal] = useState(null);
  const [payKind, setPayKind] = useState(null); // "single" | "group" | "rental"
  const [payForm, setPayForm] = useState({});

  // ════════════════════════════════════════════════════════════════
  //  SINGLE LESSON actions
  // ════════════════════════════════════════════════════════════════
  const openAddSingle = () => {
    setAddType("single");
    sf({ date: today(), level: "beginner", price: settings.singlePrices.beginner, status: "scheduled", paymentStatus: "pending", paymentMethod: "" });
  };
  const saveSingle = (op) => {
    const list = [...(data.singleLessons || [])];
    const item = { ...f, id: genId(), operatorName: op.name, operatorId: op.id };
    list.push(item);
    update("singleLessons", list);
    if (item.paymentStatus === "paid" && Number(item.paidAmount || item.price) > 0) {
      recordPayment(data, update, { customerName: item.studentName, amount: item.paidAmount || item.price, method: item.paymentMethod, type: "lesson", refId: item.id, date: item.date });
    }
    setAddType(null);
  };
  const startSingle = (l, op) => {
    const list = (data.singleLessons || []).map((x) => x.id === l.id ? { ...x, status: "in-progress", timerStart: Date.now(), operatorName: op.name, operatorId: op.id } : x);
    update("singleLessons", list);
  };
  const endSingle = (l, op) => {
    const list = (data.singleLessons || []).map((x) => x.id === l.id ? { ...x, status: "completed", timerStart: null, operatorName: op.name, operatorId: op.id } : x);
    update("singleLessons", list);
  };

  // ════════════════════════════════════════════════════════════════
  //  GROUP LESSON actions
  // ════════════════════════════════════════════════════════════════
  const openAddGroup = () => {
    setAddType("group");
    sf({ date: today(), level: "beginner", pricePerStudent: settings.groupPrices.beginner, status: "scheduled", maxCapacity: 10, students: [], paymentStatus: "pending", paymentMethod: "" });
  };
  const saveGroup = (op) => {
    const list = [...(data.groupLessons || [])];
    list.push({ ...f, id: genId(), students: f.students || [], operatorName: op.name, operatorId: op.id });
    update("groupLessons", list);
    setAddType(null);
  };
  const startGroup = (l, op) => {
    const list = (data.groupLessons || []).map((x) => x.id === l.id ? { ...x, status: "in-progress", timerStart: Date.now(), operatorName: op.name, operatorId: op.id } : x);
    update("groupLessons", list);
  };
  const endGroup = (l, op) => {
    const list = (data.groupLessons || []).map((x) => x.id === l.id ? { ...x, status: "completed", timerStart: null, operatorName: op.name, operatorId: op.id } : x);
    update("groupLessons", list);
  };

  // ════════════════════════════════════════════════════════════════
  //  BOARD / EQUIPMENT RENTAL actions
  // ════════════════════════════════════════════════════════════════
  const eqItems = data.equipment || [];
  const eqRentals = data.equipmentRentals || [];
  const eqPricing = settings.surfboardRental;

  const openAddRental = () => {
    setAddType("rental");
    sf({ status: "active", rentalType: "hourly", paymentStatus: "pending", paymentMethod: "", price: eqPricing.hourly });
  };
  const saveRental = (op) => {
    const r = { ...f, id: genId(), startTime: new Date().toISOString(), operatorName: op.name, operatorId: op.id };
    if (f.customDuration) r.endTarget = Date.now() + Number(f.customDuration) * 60000;
    update("equipmentRentals", [...eqRentals, r]);
    if (f.itemId) update("equipment", eqItems.map((i) => i.id === f.itemId ? { ...i, status: "rented" } : i));
    if (f.paymentStatus === "paid" && Number(f.paidAmount || f.price) > 0) {
      recordPayment(data, update, { customerName: f.customerName, amount: f.paidAmount || f.price, method: f.paymentMethod, type: "equipment rental", date: today() });
    }
    setAddType(null);
  };
  const completeRental = (r) => {
    setPayModal(r); setPayKind("rental");
    setPayForm({ paymentStatus: "paid", paymentMethod: r.paymentMethod || "cash", paidAmount: r.price || eqPricing[r.rentalType] || 0 });
  };
  const doCompleteRental = (op) => {
    const updR = eqRentals.map((x) => x.id === payModal.id ? { ...x, status: "completed", paymentStatus: payForm.paymentStatus, paymentMethod: payForm.paymentMethod, operatorName: op.name, operatorId: op.id } : x);
    update("equipmentRentals", updR);
    if (payModal.itemId) update("equipment", eqItems.map((i) => i.id === payModal.itemId ? { ...i, status: "available" } : i));
    if (payForm.paymentStatus !== "pending" && Number(payForm.paidAmount) > 0) {
      recordPayment(data, update, { customerName: payModal.customerName, amount: payForm.paidAmount, method: payForm.paymentMethod, type: "equipment rental", date: today() });
    }
    setPayModal(null);
  };

  // ── Quick pay for lessons ──────────────────────────────────────
  const openPaySingle = (l) => { setPayModal(l); setPayKind("single"); setPayForm({ paymentStatus: "paid", paymentMethod: "cash", paidAmount: l.price }); };
  const doPaySingle = (op) => {
    const list = (data.singleLessons || []).map((x) => x.id === payModal.id ? { ...x, paymentStatus: payForm.paymentStatus, paymentMethod: payForm.paymentMethod, paidAmount: payForm.paidAmount, operatorName: op.name, operatorId: op.id } : x);
    update("singleLessons", list);
    if (payForm.paymentStatus === "paid" || payForm.paymentStatus === "partial") {
      recordPayment(data, update, { customerName: payModal.studentName, amount: payForm.paidAmount || payModal.price, method: payForm.paymentMethod, type: "lesson", refId: payModal.id, date: today() });
    }
    setPayModal(null);
  };

  // ── Delete helpers ─────────────────────────────────────────────
  const askDel = (id, type) => { setDel(id); setDelType(type); };
  const doDel = () => {
    if (delType === "single") update("singleLessons", (data.singleLessons || []).filter((x) => x.id !== del));
    if (delType === "group") update("groupLessons", (data.groupLessons || []).filter((x) => x.id !== del));
    if (delType === "rental") {
      const r = eqRentals.find((x) => x.id === del);
      update("equipmentRentals", eqRentals.filter((x) => x.id !== del));
      if (r?.itemId) update("equipment", eqItems.map((i) => i.id === r.itemId ? { ...i, status: "available" } : i));
    }
    setDel(null); setDelType(null);
  };

  // ── Level form helper for single ───────────────────────────────
  const setF = (k, v) => {
    const n = { ...f, [k]: v };
    if (addType === "single" && k === "level" && settings.singlePrices[v]) n.price = settings.singlePrices[v];
    if (addType === "group" && k === "level" && settings.groupPrices[v]) n.pricePerStudent = settings.groupPrices[v];
    if (addType === "rental" && k === "rentalType") n.price = eqPricing[v];
    sf(n);
  };

  // ════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Page Header + Quick-Add Buttons ─────────────────────── */}
      <Header title="Activities" sub="All active operations at a glance" />

      {/* Quick-add strip */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={S.btn(C.pri, "#fff")} onClick={openAddSingle}>+ Single Lesson</button>
        <button style={S.btn(C.yel, C.pri)} onClick={openAddGroup}>+ Group Lesson</button>
        <button style={{ ...S.btn(C.blu, "#fff"), background: C.blu }} onClick={openAddRental}>+ Board Rent</button>
      </div>

      {/* ── Live Counts Bar ─────────────────────────────────────── */}
      <div className="activities-counts" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          ["🟢 Active Now", totalActive, C.grn, C.grnB],
          ["📋 Scheduled Today", totalScheduled, C.blu, C.bluB],
          ["🏄 Boards Out", activeEquip.length, C.pur, C.purB],
          ["🏖️ Sunbeds Out", activeSunbed.length, C.orn, C.ornB],
        ].map(([label, count, col, bg]) => (
          <div key={label} style={{ ...S.card, flex: "1 1 140px", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: col, lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: 11, color: C.sec, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          ACTIVE SINGLE LESSONS
      ════════════════════════════════════════════════════════════ */}
      <SectionTitle icon="🏄" title="Single Lessons" activeCount={activeSingle.length} scheduledCount={scheduledSingle.length} />

      {activeSingle.length === 0 && scheduledSingle.length === 0 ? (
        <Empty msg="No active or scheduled single lessons today" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {activeSingle.map((l) => {
            const el = l.timerStart ? tick - l.timerStart : 0;
            return (
              <div key={l.id} className="lesson-card" style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, borderLeft: `3px solid ${C.grn}` }}>
                <div style={{ minWidth: 58, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.yelD, lineHeight: 1 }}>{fmtElapsed(el)}</div>
                  <div style={{ fontSize: 9, color: C.mut, marginTop: 2 }}>elapsed</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.studentName || "—"}</div>
                  <div style={{ fontSize: 11, color: C.sec }}>{l.level} · {fmt$(l.price, settings)} {l.instructorName ? `· ${l.instructorName}` : ""}</div>
                  {l.operatorName && <div style={{ fontSize: 10, color: C.blu }}>by {l.operatorName}</div>}
                </div>
                <div className="lesson-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Tag status="in-progress" /><Tag status={l.paymentStatus || "pending"} />
                  {l.paymentStatus !== "paid" && <button style={S.btnO(C.grn)} onClick={() => openPaySingle(l)}>💰 Pay</button>}
                  <button style={S.btn(C.orn, "#fff")} onClick={() => verifyPin((op) => endSingle(l, op))}>End</button>
                  <button style={S.btnO(C.red)} onClick={() => askDel(l.id, "single")}>✕</button>
                </div>
              </div>
            );
          })}
          {scheduledSingle.map((l) => (
            <div key={l.id} className="lesson-card" style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, opacity: 0.75 }}>
              <div style={{ minWidth: 58, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.blu }}>{l.startTime || "—"}</div>
                <div style={{ fontSize: 9, color: C.mut }}>scheduled</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.studentName || "—"}</div>
                <div style={{ fontSize: 11, color: C.sec }}>{l.level} · {fmt$(l.price, settings)}</div>
              </div>
              <div className="lesson-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Tag status="scheduled" />
                <button style={S.btn(C.yel, C.pri)} onClick={() => verifyPin((op) => startSingle(l, op))}>Start</button>
                <button style={S.btnO(C.red)} onClick={() => askDel(l.id, "single")}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          ACTIVE GROUP LESSONS
      ════════════════════════════════════════════════════════════ */}
      <SectionTitle icon="👥" title="Group Lessons" activeCount={activeGroup.length} scheduledCount={scheduledGroup.length} />

      {activeGroup.length === 0 && scheduledGroup.length === 0 ? (
        <Empty msg="No active or scheduled group lessons today" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {activeGroup.map((l) => {
            const el = l.timerStart ? tick - l.timerStart : 0;
            return (
              <div key={l.id} style={{ ...S.card, borderLeft: `3px solid ${C.grn}` }}>
                <div className="lesson-card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: (l.students || []).length > 0 ? 8 : 0 }}>
                  <div style={{ minWidth: 58, textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.yelD, lineHeight: 1 }}>{fmtElapsed(el)}</div>
                    <div style={{ fontSize: 9, color: C.mut, marginTop: 2 }}>elapsed</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.groupName || "Group Lesson"}</div>
                    <div style={{ fontSize: 11, color: C.sec }}>{l.level} · {fmt$(l.pricePerStudent, settings)}/student · {(l.students || []).length}/{l.maxCapacity || 10}</div>
                  </div>
                  <div className="lesson-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Tag status="in-progress" />
                    <button style={S.btn(C.orn, "#fff")} onClick={() => verifyPin((op) => endGroup(l, op))}>End</button>
                    <button style={S.btnO(C.red)} onClick={() => askDel(l.id, "group")}>✕</button>
                  </div>
                </div>
                {(l.students || []).length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingLeft: 70 }}>
                    {(l.students || []).map((s) => (
                      <span key={s.id} style={{ ...S.tag(s.paymentStatus === "paid" ? C.grnB : C.ornB, s.paymentStatus === "paid" ? C.grn : C.orn), fontSize: 10 }}>{s.name}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {scheduledGroup.map((l) => (
            <div key={l.id} className="lesson-card" style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, opacity: 0.75 }}>
              <div style={{ minWidth: 58, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.blu }}>{l.startTime || "—"}</div>
                <div style={{ fontSize: 9, color: C.mut }}>scheduled</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.groupName || "Group Lesson"}</div>
                <div style={{ fontSize: 11, color: C.sec }}>{l.level} · {(l.students || []).length}/{l.maxCapacity || 10} students</div>
              </div>
              <div className="lesson-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Tag status="scheduled" />
                <button style={S.btn(C.yel, C.pri)} onClick={() => verifyPin((op) => startGroup(l, op))}>Start</button>
                <button style={S.btnO(C.red)} onClick={() => askDel(l.id, "group")}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          ACTIVE BOARD / EQUIPMENT RENTALS
      ════════════════════════════════════════════════════════════ */}
      <SectionTitle icon="🏄" title="Board Rentals" activeCount={activeEquip.length} />

      {activeEquip.length === 0 ? (
        <Empty msg="No active board rentals" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {activeEquip.map((r) => {
            const rem = r.endTarget ? Math.max(0, r.endTarget - tick) : null;
            const over = r.endTarget && tick > r.endTarget;
            return (
              <div key={r.id} className="lesson-card" style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, borderLeft: over ? `3px solid ${C.red}` : rem && rem < 600000 ? `3px solid ${C.orn}` : `3px solid ${C.pur}` }}>
                <div style={{ minWidth: 58, textAlign: "center" }}>
                  {rem !== null ? (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 700, color: over ? C.red : rem < 600000 ? C.orn : C.grn, lineHeight: 1 }}>{over ? "OVER" : fmtElapsed(rem)}</div>
                      <div style={{ fontSize: 9, color: C.mut, marginTop: 2 }}>{over ? "due" : "left"}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.pur }}>{r.rentalType}</div>
                      <div style={{ fontSize: 9, color: C.mut }}>open</div>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.customerName || "—"}</div>
                  <div style={{ fontSize: 11, color: C.sec }}>{r.itemName || r.itemId || "Board"} · {fmt$(r.price || eqPricing[r.rentalType], settings)} · <Tag status={r.paymentStatus || "pending"} /></div>
                </div>
                <div className="lesson-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <button style={S.btn(C.grn, "#fff")} onClick={() => completeRental(r)}>💰 Complete</button>
                  <button style={S.btnO(C.red)} onClick={() => askDel(r.id, "rental")}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Active Sunbed Rentals (read-only summary) ──────────── */}
      {activeSunbed.length > 0 && (
        <>
          <SectionTitle icon="🏖️" title="Sunbed Rentals" activeCount={activeSunbed.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {activeSunbed.map((r) => {
              const rem = r.endTarget ? Math.max(0, r.endTarget - tick) : null;
              const over = r.endTarget && tick > r.endTarget;
              return (
                <div key={r.id} className="lesson-card" style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, borderLeft: `3px solid ${C.orn}` }}>
                  <div style={{ minWidth: 58, textAlign: "center" }}>
                    {rem !== null ? (
                      <div style={{ fontSize: 14, fontWeight: 700, color: over ? C.red : C.grn, lineHeight: 1 }}>{over ? "OVER" : fmtElapsed(rem)}</div>
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.orn }}>{r.rentalType}</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.customerName || "—"}</div>
                    <div style={{ fontSize: 11, color: C.sec }}>{r.itemName || "Sunbed"} · {fmt$(r.price || settings.sunbedRental[r.rentalType], settings)}</div>
                  </div>
                  <Tag status={r.paymentStatus || "pending"} />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          ADD SINGLE LESSON MODAL
      ════════════════════════════════════════════════════════════ */}
      <Modal open={addType === "single"} onClose={() => setAddType(null)} title="New Single Lesson">
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
        <label style={S.label}>Instructor Fee (LKR)</label>
        <input style={S.inp} type="number" value={f.instructorFlatPrice || ""} onChange={(e) => setF("instructorFlatPrice", e.target.value)} placeholder="Amount to pay instructor for this lesson" />
        <PaymentSection form={f} setForm={sf} totalAmount={f.price} label="Lesson Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setAddType(null)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => saveSingle(op))}>Save Lesson</button>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          ADD GROUP LESSON MODAL
      ════════════════════════════════════════════════════════════ */}
      <Modal open={addType === "group"} onClose={() => setAddType(null)} title="New Group Lesson">
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
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setAddType(null)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => saveGroup(op))}>Save Group</button>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          ADD BOARD RENTAL MODAL
      ════════════════════════════════════════════════════════════ */}
      <Modal open={addType === "rental"} onClose={() => setAddType(null)} title="New Board Rental">
        <label style={S.label}>Board</label>
        <select style={S.sel} value={f.itemId || ""} onChange={(e) => { const it = eqItems.find((i) => i.id === e.target.value); sf({ ...f, itemId: e.target.value, itemName: it?.name || it?.number || "" }); }}>
          <option value="">Select available board</option>{eqItems.filter((i) => i.status === "available" && (i.type === "surfboard" || !i.type)).map((i) => <option key={i.id} value={i.id}>{i.name || i.number}</option>)}
        </select>
        <label style={S.label}>Customer Name</label><input style={S.inp} value={f.customerName || ""} onChange={(e) => sf({ ...f, customerName: e.target.value })} />
        <div style={S.grid2}>
          <div><label style={S.label}>Rental Type</label><select style={S.sel} value={f.rentalType || ""} onChange={(e) => setF("rentalType", e.target.value)}><option value="hourly">Hourly (LKR {eqPricing.hourly})</option><option value="daily">Daily (LKR {eqPricing.daily})</option></select></div>
          <div><label style={S.label}>Duration (min, optional)</label><input style={S.inp} type="number" value={f.customDuration || ""} onChange={(e) => sf({ ...f, customDuration: e.target.value })} placeholder="No countdown" /></div>
        </div>
        <PaymentSection form={f} setForm={sf} totalAmount={f.price || eqPricing[f.rentalType || "hourly"]} label="Rental Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setAddType(null)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => saveRental(op))}>Start Rental</button>
        </div>
      </Modal>

      {/* ── Quick Pay Modal (single lessons) ──────────────────────── */}
      <Modal open={!!payModal && payKind === "single"} onClose={() => setPayModal(null)} title={`Collect Payment — ${payModal?.studentName || ""}`}>
        <div style={{ background: C.yelL, borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Lesson Price</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt$(payModal?.price, settings)}</span>
        </div>
        <PaymentSection form={payForm} setForm={setPayForm} totalAmount={payModal?.price} label="Collect Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setPayModal(null)}>Cancel</button>
          <button style={S.btn(C.grn, "#fff")} onClick={() => verifyPin((op) => doPaySingle(op))}>💰 Confirm Payment</button>
        </div>
      </Modal>

      {/* ── Complete Rental Payment Modal ─────────────────────────── */}
      <Modal open={!!payModal && payKind === "rental"} onClose={() => setPayModal(null)} title={`Complete Rental — ${payModal?.customerName || ""}`}>
        <div style={{ background: C.yelL, borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12 }}>Rental Price</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt$(payModal?.price || 0, settings)}</span>
        </div>
        <PaymentSection form={payForm} setForm={setPayForm} totalAmount={payModal?.price} label="Collect Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setPayModal(null)}>Cancel</button>
          <button style={S.btn(C.grn, "#fff")} onClick={() => verifyPin((op) => doCompleteRental(op))}>💰 Complete & Pay</button>
        </div>
      </Modal>

      <DeleteGuard open={!!del} onYes={doDel} onNo={() => { setDel(null); setDelType(null); }} msg="Remove this activity?" itemDesc={`Activity: ${delType === "single" ? ((data.singleLessons || []).find((x) => x.id === del) || {}).studentName || "lesson" : delType === "group" ? ((data.groupLessons || []).find((x) => x.id === del) || {}).groupName || "group" : ((data.equipmentRentals || []).find((x) => x.id === del) || {}).customerName || "rental"}`} dataKey={delType === "single" ? "singleLessons" : delType === "group" ? "groupLessons" : "equipmentRentals"} itemId={del} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  Section Title — small helper for each activity group
// ════════════════════════════════════════════════════════════════════
function SectionTitle({ icon, title, activeCount, scheduledCount }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
      {activeCount > 0 && <span style={{ ...S.tag(C.grnB, C.grn), fontSize: 10 }}>{activeCount} active</span>}
      {scheduledCount > 0 && <span style={{ ...S.tag(C.bluB, C.blu), fontSize: 10 }}>{scheduledCount} scheduled</span>}
    </div>
  );
}
