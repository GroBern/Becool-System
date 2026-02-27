import { useState } from "react";
import { useAppContext, usePinVerify } from "../../context";
import { C, S } from "../../styles";
import { genId, today, fmt$, fmtElapsed } from "../../utils";
import { recordPayment } from "../../utils/payments";
import { Modal, DeleteGuard, Tag, Empty, Header } from "../../components/ui";
import { PaymentSection } from "../../components/payment";

export default function RentalPage({ title, invKey, rentKey, typeOpts }) {
  const { data, update, settings, tick } = useAppContext();
  const { verifyPin } = usePinVerify();
  const [tab, setTab] = useState("inventory");
  const [open, setOpen] = useState(false);
  const [mType, setMType] = useState("item");
  const [f, sf] = useState({});
  const [del, setDel] = useState(null);
  const items = data[invKey] || [];
  const rentals = data[rentKey] || [];
  const activeR = rentals.filter((r) => r.status === "active");
  const pricing = invKey === "sunbeds" ? settings.sunbedRental : settings.surfboardRental;

  const openItem = () => { setMType("item"); sf({ status: "available" }); setOpen(true); };
  const openRental = () => { setMType("rental"); sf({ status: "active", rentalType: "hourly", paymentStatus: "pending", paymentMethod: "" }); setOpen(true); };

  const doSave = (op) => {
    if (mType === "item") {
      update(invKey, [...items, { ...f, id: genId(), operatorName: op.name, operatorId: op.id }]);
    } else {
      const r = { ...f, id: genId(), startTime: new Date().toISOString(), operatorName: op.name, operatorId: op.id };
      if (f.customDuration) r.endTarget = Date.now() + Number(f.customDuration) * 60000;
      update(rentKey, [...rentals, r]);
      if (f.itemId) { update(invKey, items.map((i) => i.id === f.itemId ? { ...i, status: "rented" } : i)); }
      if (f.paymentStatus === "paid" && Number(f.paidAmount || f.price) > 0) {
        recordPayment(data, update, { customerName: f.customerName, amount: f.paidAmount || f.price, method: f.paymentMethod, type: invKey === "sunbeds" ? "sunbed rental" : "equipment rental", date: today() });
      }
    }
    setOpen(false);
  };

  // Complete with payment
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({});
  const openComplete = (r) => { setPayModal(r); setPayForm({ paymentStatus: r.paymentStatus === "paid" ? "paid" : "paid", paymentMethod: r.paymentMethod || "cash", paidAmount: r.price || pricing[r.rentalType] || 0 }); };
  const doComplete = (op) => {
    const updR = rentals.map((x) => x.id === payModal.id ? { ...x, status: "completed", paymentStatus: payForm.paymentStatus, paymentMethod: payForm.paymentMethod, operatorName: op.name, operatorId: op.id } : x);
    update(rentKey, updR);
    if (payModal.itemId) update(invKey, items.map((i) => i.id === payModal.itemId ? { ...i, status: "available" } : i));
    if (payForm.paymentStatus !== "pending" && Number(payForm.paidAmount) > 0) {
      recordPayment(data, update, { customerName: payModal.customerName, amount: payForm.paidAmount, method: payForm.paymentMethod, type: invKey === "sunbeds" ? "sunbed rental" : "equipment rental", date: today() });
    }
    setPayModal(null);
  };

  const doDelete = () => { update(invKey, items.filter((i) => i.id !== del)); update(rentKey, rentals.filter((r) => r.id !== del)); setDel(null); };

  return (
    <div>
      <Header title={title} sub={`${title} inventory & rentals`}>
        <button style={tab === "inventory" ? S.btn(C.pri, "#fff") : S.btnO()} onClick={() => setTab("inventory")}>Inventory</button>
        <button style={tab === "rentals" ? S.btn(C.pri, "#fff") : S.btnO()} onClick={() => setTab("rentals")}>Active Rentals</button>
        <button style={S.btn(C.yel, C.pri)} onClick={tab === "inventory" ? openItem : openRental}>+ {tab === "inventory" ? "Item" : "Rental"}</button>
      </Header>
      {tab === "inventory" ? (
        items.length === 0 ? <Empty msg={`No ${title.toLowerCase()}`} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
            {items.map((i) => (
              <div key={i.id} style={{ ...S.card, textAlign: "center" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{i.name || i.number}</div>
                <Tag status={i.status} />{i.type && <div style={{ fontSize: 10, color: C.sec, marginTop: 3 }}>{i.type}</div>}
                <div style={{ marginTop: 6 }}><button style={S.btnO(C.red)} onClick={() => setDel(i.id)}>✕</button></div>
              </div>
            ))}
          </div>
        )
      ) : (
        activeR.length === 0 ? <Empty msg="No active rentals" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeR.map((r) => {
              const rem = r.endTarget ? Math.max(0, r.endTarget - tick) : null;
              const over = r.endTarget && tick > r.endTarget;
              return (
                <div key={r.id} className="lesson-card" style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: over ? `3px solid ${C.red}` : rem && rem < 600000 ? `3px solid ${C.orn}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.customerName || "—"} — {r.itemName || r.itemId}</div>
                    <div style={{ fontSize: 10.5, color: C.sec }}>{r.rentalType} · {fmt$(r.price || pricing[r.rentalType], settings)} · <Tag status={r.paymentStatus || "pending"} />{r.operatorName ? ` · by ${r.operatorName}` : ""}</div>
                  </div>
                  <div style={S.row}>
                    {rem !== null && <span style={{ fontSize: 12, fontWeight: 700, color: over ? C.red : rem < 600000 ? C.orn : C.grn }}>{over ? "OVERDUE" : fmtElapsed(rem)}</span>}
                    <button style={S.btn(C.grn, "#fff")} onClick={() => openComplete(r)}>💰 Complete</button>
                    <button style={S.btnO(C.red)} onClick={() => setDel(r.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Add Item/Rental Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={mType === "item" ? `Add ${title}` : "Start Rental"}>
        {mType === "item" ? (
          <>
            <label style={S.label}>Name/Number</label><input style={S.inp} value={f.name || ""} onChange={(e) => sf({ ...f, name: e.target.value, number: e.target.value })} />
            {typeOpts && (
              <><label style={S.label}>Type</label><select style={S.sel} value={f.type || ""} onChange={(e) => sf({ ...f, type: e.target.value })}><option value="">Select</option>{typeOpts.map((t) => <option key={t} value={t}>{t}</option>)}</select></>
            )}
            <label style={S.label}>Status</label><select style={S.sel} value={f.status || ""} onChange={(e) => sf({ ...f, status: e.target.value })}><option value="available">Available</option><option value="maintenance">Maintenance</option></select>
          </>
        ) : (
          <>
            <label style={S.label}>Item</label>
            <select style={S.sel} value={f.itemId || ""} onChange={(e) => { const it = items.find((i) => i.id === e.target.value); sf({ ...f, itemId: e.target.value, itemName: it?.name || it?.number || "" }); }}>
              <option value="">Select available</option>{items.filter((i) => i.status === "available").map((i) => <option key={i.id} value={i.id}>{i.name || i.number}</option>)}
            </select>
            <label style={S.label}>Customer Name</label><input style={S.inp} value={f.customerName || ""} onChange={(e) => sf({ ...f, customerName: e.target.value })} />
            <div style={S.grid2}>
              <div><label style={S.label}>Rental Type</label><select style={S.sel} value={f.rentalType || ""} onChange={(e) => sf({ ...f, rentalType: e.target.value, price: pricing[e.target.value] })}><option value="hourly">Hourly (LKR {pricing.hourly})</option><option value="daily">Daily (LKR {pricing.daily})</option></select></div>
              <div><label style={S.label}>Duration (min, optional)</label><input style={S.inp} type="number" value={f.customDuration || ""} onChange={(e) => sf({ ...f, customDuration: e.target.value })} placeholder="No countdown" /></div>
            </div>
            <PaymentSection form={f} setForm={sf} totalAmount={f.price || pricing[f.rentalType || "hourly"]} label="Rental Payment" />
          </>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setOpen(false)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => doSave(op))}>Save</button>
        </div>
      </Modal>

      {/* Complete Rental with Payment */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Complete Rental — ${payModal?.customerName || ""}`}>
        <div style={{ background: C.yelL, borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12 }}>Rental Price</span><span style={{ fontSize: 16, fontWeight: 700 }}>{fmt$(payModal?.price || 0, settings)}</span>
        </div>
        <PaymentSection form={payForm} setForm={setPayForm} totalAmount={payModal?.price} label="Collect Payment" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setPayModal(null)}>Cancel</button>
          <button style={S.btn(C.grn, "#fff")} onClick={() => verifyPin((op) => doComplete(op))}>💰 Complete & Pay</button>
        </div>
      </Modal>
      <DeleteGuard open={!!del} onYes={doDelete} onNo={() => setDel(null)} itemDesc={`${title}: ${(items.find((i) => i.id === del) || {}).name || (rentals.find((r) => r.id === del) || {}).customerName || "item"}`} dataKey={items.find((i) => i.id === del) ? invKey : rentKey} itemId={del} />
    </div>
  );
}
