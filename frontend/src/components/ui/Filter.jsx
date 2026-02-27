import { S } from "../../styles";

export default function Filter({ v, set, opts, ph }) {
  return (
    <select
      value={v}
      onChange={(e) => set(e.target.value)}
      style={{ ...S.sel, marginBottom: 0, maxWidth: 150, background: "rgba(255,255,255,.7)" }}
    >
      <option value="">{ph || "All"}</option>
      {opts.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}
