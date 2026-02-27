import { useState } from "react";
import { useAppContext, usePinVerify } from "../../context";
import { C, S } from "../../styles";
import { genId } from "../../utils";
import { Modal, DeleteGuard, Tag, Empty, Header, Search } from "../../components/ui";

export default function CrudPage({ title, sub, dk, fields }) {
  const { data, update } = useAppContext();
  const { verifyPin } = usePinVerify();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [ed, setEd] = useState(null);
  const [del, setDel] = useState(null);
  const [f, sf] = useState({});

  const items = (data[dk] || []).filter((i) =>
    !search || fields.some((fi) => (i[fi.k] || "").toString().toLowerCase().includes(search.toLowerCase()))
  );

  const add = () => { setEd(null); sf({}); setOpen(true); };
  const edit = (item) => { setEd(item); sf({ ...item }); setOpen(true); };
  const doSave = (op) => {
    const list = [...(data[dk] || [])];
    const item = { ...f, operatorName: op.name, operatorId: op.id };
    if (ed) { const i = list.findIndex((x) => x.id === ed.id); if (i >= 0) list[i] = { ...list[i], ...item }; }
    else list.push({ ...item, id: genId() });
    update(dk, list);
    setOpen(false);
  };
  const doDelete = () => { update(dk, (data[dk] || []).filter((i) => i.id !== del)); setDel(null); };

  return (
    <div>
      <Header title={title} sub={sub} onAdd={add}><Search v={search} set={setSearch} /></Header>
      {items.length === 0 ? <Empty /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => (
            <div key={item.id} className="lesson-card" style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item[fields[0].k] || "—"}</div>
                <div style={{ fontSize: 11, color: C.sec }}>{fields.slice(1).map((fi) => `${fi.l}: ${item[fi.k] || "—"}`).join(" · ")}</div>
              </div>
              <div style={S.row}>
                {item.availability && <Tag status={item.availability} />}
                <button style={S.btnO()} onClick={() => edit(item)}>Edit</button>
                <button style={S.btnO(C.red)} onClick={() => setDel(item.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={ed ? `Edit` : `Add New`}>
        {fields.map((fi) => (
          <div key={fi.k}>
            <label style={S.label}>{fi.l}</label>
            {fi.t === "select" ? (
              <select style={S.sel} value={f[fi.k] || ""} onChange={(e) => sf({ ...f, [fi.k]: e.target.value })}>
                <option value="">Select</option>
                {fi.opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ) : (
              <input style={S.inp} type={fi.t || "text"} value={f[fi.k] || ""} onChange={(e) => sf({ ...f, [fi.k]: e.target.value })} />
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
          <button style={S.btn("transparent", C.sec)} onClick={() => setOpen(false)}>Cancel</button>
          <button style={S.btn(C.pri, "#fff")} onClick={() => verifyPin((op) => doSave(op))}>Save</button>
        </div>
      </Modal>
      <DeleteGuard open={!!del} onYes={doDelete} onNo={() => setDel(null)} itemDesc={`${title}: ${((data[dk] || []).find((i) => i.id === del) || {})[fields[0].k] || "item"}`} dataKey={dk} itemId={del} />
    </div>
  );
}
