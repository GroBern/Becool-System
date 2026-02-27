import { C } from "../../styles";

export default function Empty({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: C.mut, fontSize: 12.5 }}>
      {msg || "No data yet"}
    </div>
  );
}
