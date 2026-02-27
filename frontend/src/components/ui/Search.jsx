import { S } from "../../styles";

export default function Search({ v, set, ph }) {
  return (
    <input
      type="text"
      value={v}
      onChange={(e) => set(e.target.value)}
      placeholder={ph || "Search..."}
      style={{ ...S.inp, marginBottom: 0, maxWidth: 200, background: "rgba(255,255,255,.7)" }}
    />
  );
}
