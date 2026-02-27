import { C, S } from "../../styles";

const STATUS_MAP = {
  available: [C.grnB, C.grn],
  busy: [C.ornB, C.orn],
  off: ["#f0ece4", C.mut],
  scheduled: [C.bluB, C.blu],
  "in-progress": [C.yelL, C.yelD],
  completed: [C.grnB, C.grn],
  cancelled: ["#f0ece4", C.mut],
  active: [C.grnB, C.grn],
  rented: [C.yelL, C.yelD],
  maintenance: [C.ornB, C.orn],
  pending: [C.ornB, C.orn],
  partial: [C.yelL, C.yelD],
  paid: [C.grnB, C.grn],
  cash: [C.grnB, C.grn],
  card: [C.bluB, C.blu],
  online: [C.purB, C.pur],
};

export default function Tag({ status }) {
  const [bg, col] = STATUS_MAP[status] || ["#f0ece4", C.mut];
  return <span style={S.tag(bg, col)}>{status}</span>;
}
